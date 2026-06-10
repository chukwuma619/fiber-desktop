import { useState } from "react";
import { useCopyWithFeedback } from "../hooks/useCopyWithFeedback";
import { recordActivity } from "../lib/activityHistory";
import { sendDesktopNotification } from "../lib/desktopNotify";
import type { NodePresenceKind } from "../lib/nodePresence";
import { formatRpcUserError } from "../lib/rpcUserError";
import { useRpc } from "../lib/useRpc";
import { NodeUnreachableBanner } from "./NodeUnreachableBanner";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type SendTabProps = {
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
  rpcReachable: boolean;
  nodePresence: NodePresenceKind;
  onGoToNode?: () => void;
};

export function SendTab({
  callFiberRpc,
  rpcReachable,
  nodePresence,
  onGoToNode,
}: SendTabProps) {
  const [payInvoice, setPayInvoice] = useState("");
  const [lastPayHash, setLastPayHash] = useState<string | null>(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  const { runRpc, rpcError, setRpcError, history, rawJson, busy, anyBusy } =
    useRpc({
      callFiberRpc,
      formatError: formatRpcUserError,
      onResult: (method, result) => {
        if (method === "send_payment" && isRecord(result)) {
          const hash =
            typeof result.payment_hash === "string" ? result.payment_hash : null;
          if (hash) {
            setLastPayHash(hash);
            setVerifyHash(hash);
            recordActivity({
              kind: "payment_sent",
              title: "Payment submitted",
              detail: hash,
            });
            void sendDesktopNotification(
              "Payment sent",
              "Your payment was submitted to the network.",
            );
          }
        }
        if (method === "get_payment" && isRecord(result)) {
          const status =
            typeof result.status === "string" ? result.status : null;
          if (status) setVerifyStatus(status);
        }
      },
    });

  const { copy, copyFeedback } = useCopyWithFeedback();

  const rpcBlocked = !rpcReachable;

  return (
    <div className="pmt-layout">
      <NodeUnreachableBanner
        nodePresence={nodePresence}
        rpcReachable={rpcReachable}
        onGoToNode={onGoToNode}
      />
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

      {/* Send a Payment */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Send a Payment</h2>
            <p className="pmt-step-desc">
              Paste an invoice from another node and send the payment.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="pay-invoice">
              Invoice string
            </label>
            <input
              id="pay-invoice"
              className="input input-mono"
              value={payInvoice}
              onChange={(e) => setPayInvoice(e.target.value)}
              placeholder="fibt1… or fiber1…"
              spellCheck={false}
            />
            <p className="field-hint">
              Only pay invoices you trust — there is no undo once routed.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={rpcBlocked || anyBusy || !payInvoice.trim()}
            onClick={() =>
              void runRpc("Send payment", "send_payment", [
                { invoice: payInvoice.trim() },
              ])
            }
          >
            {busy("Send payment") ? "Sending…" : "Pay Invoice"}
          </button>

          {lastPayHash && (
            <div className="pmt-result pmt-result-ok">
              <span className="pmt-result-label">Payment sent</span>
              <div className="pmt-result-row">
                <code className="code-pill code-pill-break">{lastPayHash}</code>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pmt-copy-btn"
                  onClick={() => void copy(lastPayHash)}
                >
                  Copy hash
                </button>
                {copyFeedback ? (
                  <span className="save-toast" role="status">
                    {copyFeedback}
                  </span>
                ) : null}
              </div>
              <p className="pmt-result-note">
                This payment hash is pre-filled below so you can verify it.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Verify Payment */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Verify Payment</h2>
            <p className="pmt-step-desc">
              Check payment status by hash after sending.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="verify-hash">
              Payment hash
            </label>
            <div className="inline-field">
              <input
                id="verify-hash"
                className="input input-mono"
                value={verifyHash}
                onChange={(e) => {
                  setVerifyHash(e.target.value);
                  setVerifyStatus(null);
                }}
                placeholder="0x… (auto-filled after sending)"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={rpcBlocked || anyBusy || !verifyHash.trim()}
                onClick={() =>
                  void runRpc("Get payment", "get_payment", [
                    { payment_hash: verifyHash.trim() },
                  ])
                }
              >
                {busy("Get payment") ? "Checking…" : "Check Status"}
              </button>
            </div>
          </div>

          {verifyStatus && (
            <div className="pmt-result pmt-result-ok">
              <span className="pmt-result-label">Payment status</span>
              <span className="pmt-verify-status">{verifyStatus}</span>
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
