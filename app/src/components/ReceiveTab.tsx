import { useState } from "react";
import type { NetworkId } from "../lib/publicNodes";
import { pickInvoiceAddress } from "../lib/networkRpcParse";
import { useRpc } from "../lib/useRpc";

const INVOICE_PRESETS = [
  { label: "1 CKB", value: "0x5f5e100" },
  { label: "10 CKB", value: "0x3b9aca00" },
  { label: "100 CKB", value: "0x2540be400" },
];

export type ReceiveTabProps = {
  netId: NetworkId;
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function ReceiveTab({ netId, callFiberRpc }: ReceiveTabProps) {
  const currency = netId === "mainnet" ? "Fibb" : "Fibt";

  const [invoiceAmount, setInvoiceAmount] = useState("0x5f5e100");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState<string | null>(null);

  const { runRpc, rpcError, setRpcError, history, rawJson, busy, anyBusy } =
    useRpc({
      callFiberRpc,
      onResult: (method, result) => {
        if (method === "new_invoice") {
          const inv = pickInvoiceAddress(result);
          if (inv) setGeneratedInvoice(inv);
        }
      },
    });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pmt-layout">
      {rpcError && (
        <div className="network-inline-error" role="alert">
          <strong className="network-inline-error-title">Request failed</strong>
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
            <h2 className="pmt-step-title">Receive a Payment</h2>
            <p className="pmt-step-desc">
              Generate an invoice and share the string with the sender.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="inv-amount">
              Amount (hex shannons)
            </label>
            <div className="amount-preset-row">
              {INVOICE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setInvoiceAmount(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              id="inv-amount"
              className="input input-mono"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              spellCheck={false}
            />
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
            disabled={anyBusy}
            onClick={() => {
              const params: Record<string, unknown> = {
                amount: invoiceAmount.trim(),
                currency,
              };
              if (invoiceDesc.trim()) params.description = invoiceDesc.trim();
              void runRpc("Create invoice", "new_invoice", [params]);
            }}
          >
            {busy("Create invoice") ? "Generating…" : "Create Invoice"}
          </button>

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
              </div>
              <p className="pmt-result-note">
                Send this invoice string to the payer. Once paid, check My
                Channels to confirm the balance change.
              </p>
            </div>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="panel pmt-activity">
          <div className="panel-head">
            <h2 className="panel-title">Activity</h2>
            <span className="panel-meta">
              {history.length} call{history.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="network-history" aria-label="RPC activity">
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
            <summary>Raw JSON (last response)</summary>
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
