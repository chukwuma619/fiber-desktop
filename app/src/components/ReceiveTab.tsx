import { useCallback, useMemo, useRef, useState } from "react";
import { useInvoiceStatusPolling } from "../hooks/useInvoiceStatusPolling";
import { useCopyWithFeedback } from "../hooks/useCopyWithFeedback";
import { ckbAmountToShannonsHex } from "../lib/ckbAmount";
import {
  invoiceStatusBadgeClass,
  invoiceStatusToDisplay,
  parseGetInvoiceStatus,
  parseNewInvoiceResult,
  truncateMiddle,
} from "../lib/networkRpcParse";
import type { NetworkId } from "../lib/publicNodes";
import {
  isInvoiceStatusTerminal,
  loadRecentInvoices,
  prependRecentInvoice,
  saveRecentInvoices,
  type InvoiceDisplayStatus,
  type RecentInvoice,
} from "../lib/recentInvoices";
import { formatRpcUserError } from "../lib/rpcUserError";
import { useRpc } from "../lib/useRpc";

const INVOICE_PRESETS_CKB = ["1", "10", "100"];

export type ReceiveTabProps = {
  netId: NetworkId;
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function ReceiveTab({ netId, callFiberRpc }: ReceiveTabProps) {
  const currency = netId === "mainnet" ? "Fibb" : "Fibt";

  const [invoiceAmountCkb, setInvoiceAmountCkb] = useState("1");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState<string | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>(() =>
    loadRecentInvoices()
  );
  const recentInvoicesRef = useRef(recentInvoices);
  recentInvoicesRef.current = recentInvoices;

  const fundingHex = ckbAmountToShannonsHex(invoiceAmountCkb);

  const persistInvoices = useCallback((next: RecentInvoice[]) => {
    setRecentInvoices(next);
    saveRecentInvoices(next);
  }, []);

  const refreshPendingStatuses = useCallback(async () => {
    const pending = recentInvoicesRef.current.filter(
      (i) => !isInvoiceStatusTerminal(i.status) && i.paymentHash
    );
    if (pending.length === 0) return;

    const updates = await Promise.all(
      pending.map(async (inv) => {
        try {
          const result = await callFiberRpc("get_invoice", [
            { payment_hash: inv.paymentHash },
          ]);
          const raw = parseGetInvoiceStatus(result);
          if (!raw) return null;
          const status = invoiceStatusToDisplay(raw);
          return { id: inv.id, status };
        } catch {
          return null;
        }
      })
    );

    const valid = updates.filter(
      (u): u is { id: string; status: InvoiceDisplayStatus } => u !== null
    );
    if (valid.length === 0) return;

    setRecentInvoices((prev) => {
      const next = prev.map((inv) => {
        const hit = valid.find((u) => u.id === inv.id);
        return hit ? { ...inv, status: hit.status } : inv;
      });
      saveRecentInvoices(next);
      return next;
    });
  }, [callFiberRpc]);

  const hasPendingInvoices = useMemo(
    () => recentInvoices.some((i) => !isInvoiceStatusTerminal(i.status)),
    [recentInvoices]
  );

  const { isPolling } = useInvoiceStatusPolling({
    active: hasPendingInvoices,
    onPoll: () => void refreshPendingStatuses(),
  });

  const { runRpc, rpcError, setRpcError, history, rawJson, busy, anyBusy } =
    useRpc({
      callFiberRpc,
      formatError: formatRpcUserError,
      onResult: (method, result) => {
        if (method === "new_invoice") {
          const { invoiceAddress, paymentHash } = parseNewInvoiceResult(result);
          if (invoiceAddress) {
            setGeneratedInvoice(invoiceAddress);
            const entry = {
              paymentHash: paymentHash ?? "",
              invoiceString: invoiceAddress,
              amountCkb: invoiceAmountCkb.trim(),
              description: invoiceDesc.trim(),
              status: "Pending" as const,
            };
            setRecentInvoices((prev) => {
              const next = prependRecentInvoice(prev, entry);
              saveRecentInvoices(next);
              return next;
            });
            if (paymentHash) {
              void refreshPendingStatuses();
            }
          }
        }
      },
    });

  const { copy, copyFeedback } = useCopyWithFeedback();

  const handleCreateInvoice = () => {
    if (!fundingHex) return;
    const params: Record<string, unknown> = {
      amount: fundingHex,
      currency,
    };
    if (invoiceDesc.trim()) params.description = invoiceDesc.trim();
    void runRpc("Create invoice", "new_invoice", [params]);
  };

  return (
    <div className="pmt-layout">
      {rpcError && (
        <div className="network-inline-error" role="alert">
          <strong className="network-inline-error-title">
            Could not complete request
          </strong>
          <p className="network-inline-error-body">{rpcError}</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: "0.35rem" }}
            onClick={() => setRpcError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Receive a payment</h2>
            <p className="pmt-step-desc">
              Create an invoice and share the string with the sender.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="inv-amount">
              Amount (CKB)
            </label>
            <div className="amount-preset-row">
              {INVOICE_PRESETS_CKB.map((ckb) => (
                <button
                  key={ckb}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setInvoiceAmountCkb(ckb)}
                >
                  {ckb} CKB
                </button>
              ))}
            </div>
            <input
              id="inv-amount"
              className="input"
              inputMode="decimal"
              value={invoiceAmountCkb}
              onChange={(e) => setInvoiceAmountCkb(e.target.value)}
              placeholder="e.g. 1 or 100.5"
              spellCheck={false}
            />
            {invoiceAmountCkb.trim() && fundingHex === null ? (
              <p className="field-hint field-hint-warn">
                Enter a valid CKB amount (up to 8 decimal places).
              </p>
            ) : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="inv-desc">
              Description (optional)
            </label>
            <input
              id="inv-desc"
              className="input"
              value={invoiceDesc}
              onChange={(e) => setInvoiceDesc(e.target.value)}
              placeholder="What is this payment for?"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={anyBusy || fundingHex === null}
            onClick={handleCreateInvoice}
          >
            {busy("Create invoice") ? "Generating…" : "Create invoice"}
          </button>

          <details className="pmt-advanced-details">
            <summary>Advanced details</summary>
            <p className="field-hint">
              Amount sent to node (shannons hex):{" "}
              <code className="code-pill">{fundingHex ?? "—"}</code>
            </p>
          </details>

          {generatedInvoice && (
            <div className="pmt-result pmt-result-ok">
              <span className="pmt-result-label">
                Invoice ready — share this string
              </span>
              <div className="pmt-result-row">
                <code className="code-pill code-pill-break pmt-invoice-code">
                  {generatedInvoice}
                </code>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pmt-copy-btn"
                  onClick={() => void copy(generatedInvoice)}
                >
                  Copy
                </button>
                {copyFeedback ? (
                  <span className="save-toast" role="status">
                    {copyFeedback}
                  </span>
                ) : null}
              </div>
              <p className="pmt-result-note">
                Send this string to the payer. Status updates automatically in
                Recent invoices below.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Recent invoices</h2>
            <p className="pmt-step-desc">
              Track invoices you created. Pending invoices refresh automatically
              until paid or expired.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="pmt-refresh-row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={anyBusy || recentInvoices.length === 0}
              onClick={() => void refreshPendingStatuses()}
            >
              Refresh status
            </button>
            {isPolling ? (
              <span className="pmt-refresh-stamp">Auto-refreshing…</span>
            ) : null}
            {recentInvoices.length > 0 && !isPolling ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  persistInvoices([]);
                  setGeneratedInvoice(null);
                }}
              >
                Clear list
              </button>
            ) : null}
          </div>

          {recentInvoices.length > 0 ? (
            <div className="data-table-wrap pmt-channel-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Invoice</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="pmt-invoice-time">
                        {new Date(inv.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="data-table-num">
                        {inv.amountCkb} CKB
                        {inv.description ? (
                          <span
                            className="pmt-invoice-desc"
                            title={inv.description}
                          >
                            {inv.description}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className={invoiceStatusBadgeClass(inv.status)}>
                          {inv.status}
                        </span>
                      </td>
                      <td
                        className="data-table-mono"
                        title={inv.invoiceString}
                      >
                        {truncateMiddle(inv.invoiceString, 14, 10)}
                      </td>
                      <td className="pmt-row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void copy(inv.invoiceString)}
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="network-empty-hint pmt-empty-hint">
              No invoices yet — create one above and it will appear here.
            </p>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="panel pmt-activity">
          <div className="panel-head">
            <h2 className="panel-title">Recent activity</h2>
            <span className="panel-meta">
              {history.length} call{history.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="network-history" aria-label="Recent activity">
            {history.map((h) => (
              <li key={h.id} className="network-history-item">
                <span
                  className={h.ok ? "network-history-ok" : "network-history-err"}
                  aria-hidden
                >
                  {h.ok ? "✓" : "✗"}
                </span>
                <span className="network-history-main">
                  <span className="network-history-label">{h.label}</span>
                  <span className="network-history-summary">{h.summary}</span>
                </span>
                <time
                  className="network-history-time"
                  dateTime={new Date(h.at).toISOString()}
                >
                  {new Date(h.at).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
          <details className="network-raw-details">
            <summary>Advanced: raw JSON (last response)</summary>
            <textarea
              className="response-view response-view-short"
              readOnly
              value={rawJson}
              spellCheck={false}
              aria-label="Raw JSON response"
            />
          </details>
        </section>
      )}
    </div>
  );
}
