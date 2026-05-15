import { useCallback, useState } from "react";
import type { NetworkId } from "../lib/publicNodes";
import { PUBLIC_NODES } from "../lib/publicNodes";
import {
  parseChannelList,
  parseNodeInfo,
  pickInvoiceAddress,
  summarizeRpcResult,
  type ParsedChannelRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";

const HISTORY_CAP = 20;

const SECP256K1_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

const CHANNEL_PRESETS = [
  { label: "100 CKB", value: "0x2540be400" },
  { label: "500 CKB", value: "0xba43b7400" },
];

const INVOICE_PRESETS = [
  { label: "1 CKB", value: "0x5f5e100" },
  { label: "10 CKB", value: "0x3b9aca00" },
  { label: "100 CKB", value: "0x2540be400" },
];

type HistoryItem = {
  id: string;
  at: number;
  label: string;
  ok: boolean;
  summary: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type PaymentsTabProps = {
  netId: NetworkId;
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function PaymentsTab({ netId, callFiberRpc }: PaymentsTabProps) {
  const nodes = PUBLIC_NODES[netId];
  const currency = netId === "mainnet" ? "Fibb" : "Fibt";

  // Node summary
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(null);

  // Channels
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);

  // Step 1: Open Channel
  const [customAddress, setCustomAddress] = useState("");
  const [openPubkey, setOpenPubkey] = useState("");
  const [openFunding, setOpenFunding] = useState("0x2540be400");
  const [openTempId, setOpenTempId] = useState<string | null>(null);

  // Step 3: Receive (Invoice)
  const [invoiceAmount, setInvoiceAmount] = useState("0x5f5e100");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState<string | null>(null);

  // Step 4: Send Payment
  const [payInvoice, setPayInvoice] = useState("");
  const [lastPayHash, setLastPayHash] = useState<string | null>(null);

  // Step 5: Verify
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  // Step 6: Close Channel
  const [closeChannelId, setCloseChannelId] = useState("");
  const [closeLockArg, setCloseLockArg] = useState("");

  // General
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rawJson, setRawJson] = useState<string>("");

  const pushHistory = useCallback(
    (entry: Omit<HistoryItem, "id" | "at">) => {
      setHistory((h) =>
        [
          {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: Date.now(),
          },
          ...h,
        ].slice(0, HISTORY_CAP),
      );
    },
    [],
  );

  const runRpc = useCallback(
    async (label: string, method: string, params: unknown) => {
      setRpcBusy(label);
      setRpcError(null);
      try {
        const result = await callFiberRpc(method, params);
        setRawJson(JSON.stringify(result, null, 2));

        if (method === "node_info") {
          const parsed = parseNodeInfo(result);
          setNodeSummary(parsed);
          if (parsed?.lockArg) setCloseLockArg(parsed.lockArg);
        }
        if (method === "list_channels") {
          setChannels(parseChannelList(result));
        }
        if (method === "new_invoice") {
          const inv = pickInvoiceAddress(result);
          if (inv) setGeneratedInvoice(inv);
        }
        if (method === "send_payment" && isRecord(result)) {
          const hash =
            typeof result.payment_hash === "string" ? result.payment_hash : null;
          if (hash) {
            setLastPayHash(hash);
            setVerifyHash(hash);
          }
        }
        if (method === "open_channel" && isRecord(result)) {
          const tempId =
            typeof result.temporary_channel_id === "string"
              ? result.temporary_channel_id
              : null;
          if (tempId) setOpenTempId(tempId);
        }
        if (method === "get_payment" && isRecord(result)) {
          const status =
            typeof result.status === "string" ? result.status : null;
          if (status) setVerifyStatus(status);
        }

        pushHistory({ label, ok: true, summary: summarizeRpcResult(method, result) });
      } catch (e) {
        const msg = String(e);
        setRpcError(msg);
        setRawJson(msg);
        pushHistory({
          label,
          ok: false,
          summary: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg,
        });
      } finally {
        setRpcBusy(null);
      }
    },
    [callFiberRpc, pushHistory],
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const busy = (label: string) => rpcBusy === label;
  const anyBusy = !!rpcBusy;

  return (
    <div className="pmt-layout">
      {/* ── Status bar ── */}
      <div className="pmt-status-bar">
        <div className="pmt-status-stats">
          {nodeSummary ? (
            <>
              <div className="pmt-stat">
                <span className="pmt-stat-k">Version</span>
                <span className="pmt-stat-v">{nodeSummary.version}</span>
              </div>
              <div className="pmt-stat">
                <span className="pmt-stat-k">Your pubkey</span>
                <span
                  className="pmt-stat-v pmt-stat-mono"
                  title={nodeSummary.pubkey}
                >
                  {nodeSummary.pubkeyDisplay}
                </span>
              </div>
              <div className="pmt-stat">
                <span className="pmt-stat-k">Peers</span>
                <span className="pmt-stat-v">{nodeSummary.peersCount}</span>
              </div>
              <div className="pmt-stat">
                <span className="pmt-stat-k">Channels</span>
                <span className="pmt-stat-v">{nodeSummary.channelCount}</span>
              </div>
            </>
          ) : (
            <span className="pmt-status-empty">
              Refresh node info to see your status.
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={anyBusy}
          onClick={() => void runRpc("Node info", "node_info", [])}
        >
          {busy("Node info") ? "Loading…" : "Refresh node info"}
        </button>
      </div>

      {rpcError && (
        <div className="network-inline-error" role="alert">
          <strong className="network-inline-error-title">Last request failed</strong>
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

      {/* ══ Step 1: Open Channel ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>1</span>
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Open a Channel</h2>
            <p className="pmt-step-desc">
              Connect to a peer and lock funds to open a payment channel.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          {/* 1a: Connect */}
          <div className="pmt-substep">
            <span className="pmt-substep-label">1a — Connect to a peer</span>
            <div className="pmt-relay-buttons">
              <span className="pmt-relay-prefix">Public relays:</span>
              {(
                [
                  ["Relay 1", nodes.node1],
                  ["Relay 2", nodes.node2],
                ] as [string, (typeof nodes)[keyof typeof nodes]][]
              ).map(([label, node]) => (
                <button
                  key={label}
                  type="button"
                  className="btn btn-chip"
                  disabled={anyBusy}
                  title={node.address || node.pubkey}
                  onClick={() => {
                    setOpenPubkey(node.pubkey);
                    const params = node.address
                      ? [{ pubkey: node.pubkey, address: node.address }]
                      : [{ pubkey: node.pubkey }];
                    void runRpc(`Connect ${label}`, "connect_peer", params);
                  }}
                >
                  {busy(`Connect ${label}`) ? "Connecting…" : label}
                </button>
              ))}
            </div>
            <div className="inline-field" style={{ marginTop: "0.5rem" }}>
              <input
                className="input input-mono"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="/ip4/… multiaddr or pubkey hex"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={anyBusy || !customAddress.trim()}
                onClick={() => {
                  const val = customAddress.trim();
                  const params = val.startsWith("/")
                    ? [{ address: val }]
                    : [{ pubkey: val }];
                  void runRpc("Connect peer", "connect_peer", params);
                }}
              >
                {busy("Connect peer") ? "Connecting…" : "Connect"}
              </button>
            </div>
          </div>

          {/* 1b: Fund channel */}
          <div className="pmt-substep">
            <span className="pmt-substep-label">1b — Fund a channel</span>
            <div className="field">
              <label className="field-label" htmlFor="open-pubkey">
                Peer pubkey
              </label>
              <input
                id="open-pubkey"
                className="input input-mono"
                value={openPubkey}
                onChange={(e) => setOpenPubkey(e.target.value)}
                placeholder="02… (auto-filled when you click a relay above)"
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="open-funding">
                Funding amount (hex shannons — 1 CKB = 100,000,000)
              </label>
              <div className="amount-preset-row">
                {CHANNEL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpenFunding(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="inline-field">
                <input
                  id="open-funding"
                  className="input input-mono"
                  value={openFunding}
                  onChange={(e) => setOpenFunding(e.target.value)}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={anyBusy || !openPubkey.trim()}
                  onClick={() =>
                    void runRpc("Open channel", "open_channel", [
                      {
                        pubkey: openPubkey.trim(),
                        funding_amount: openFunding.trim(),
                        public: true,
                      },
                    ])
                  }
                >
                  {busy("Open channel") ? "Opening…" : "Open Channel"}
                </button>
              </div>
              <p className="field-hint">
                Testnet public relays require ≥ 500 CKB. Connect first (step 1a), then open.
              </p>
            </div>

            {openTempId && (
              <div className="pmt-result pmt-result-ok">
                <span className="pmt-result-label">Channel opening — awaiting on-chain confirmation</span>
                <div className="pmt-result-row">
                  <code className="code-pill code-pill-break">{openTempId}</code>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void copy(openTempId)}
                  >
                    Copy
                  </button>
                </div>
                <p className="pmt-result-note">
                  Refresh My Channels (step 2) until state shows{" "}
                  <strong>CHANNEL_READY</strong> before making payments.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ Step 2: My Channels ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>2</span>
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">My Channels</h2>
            <p className="pmt-step-desc">
              Monitor channel states and balances. Click <strong>Select</strong> on a
              row to use it in step 6.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={anyBusy}
            onClick={() => void runRpc("My channels", "list_channels", [{}])}
          >
            {busy("My channels") ? "Loading…" : "Refresh Channels"}
          </button>

          {channels.length > 0 ? (
            <div className="data-table-wrap pmt-channel-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Channel ID</th>
                    <th>Peer</th>
                    <th>State</th>
                    <th>Local</th>
                    <th>Remote</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row) => (
                    <tr
                      key={row.channelId || row.peerPubkey}
                      className={
                        closeChannelId === row.channelId
                          ? "pmt-row-selected"
                          : undefined
                      }
                    >
                      <td
                        className="data-table-mono"
                        title={row.channelId}
                      >
                        {row.channelIdDisplay}
                      </td>
                      <td
                        className="data-table-mono"
                        title={row.peerPubkey}
                      >
                        {row.peerDisplay}
                      </td>
                      <td>
                        <span
                          className={`network-badge${
                            row.stateLabel.includes("READY") ||
                            row.stateLabel.includes("Ready")
                              ? ""
                              : " network-badge-muted"
                          }`}
                        >
                          {row.stateLabel.replace("CHANNEL_", "")}
                        </span>
                      </td>
                      <td className="data-table-num">{row.localBalance}</td>
                      <td className="data-table-num">{row.remoteBalance}</td>
                      <td>
                        <span className="network-badge network-badge-muted">
                          {row.isUdt ? "UDT" : "CKB"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Select for closing"
                          onClick={() => {
                            setCloseChannelId(row.channelId);
                            if (nodeSummary?.lockArg && !closeLockArg) {
                              setCloseLockArg(nodeSummary.lockArg);
                            }
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="network-empty-hint pmt-empty-hint">
              No channels loaded yet — click Refresh Channels.
            </p>
          )}
        </div>
      </section>

      {/* ══ Step 3: Receive a Payment ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>3</span>
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
              <span className="pmt-result-label">Invoice ready — share this string</span>
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
                Send this invoice string to the payer. Once paid, refresh channels
                in step 2 to confirm the balance change.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══ Step 4: Send a Payment ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>4</span>
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
            {generatedInvoice && (
              <button
                type="button"
                className="btn btn-ghost btn-sm pmt-autofill-btn"
                onClick={() => setPayInvoice(generatedInvoice)}
              >
                Use my last invoice
              </button>
            )}
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
            disabled={anyBusy || !payInvoice.trim()}
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
              </div>
              <p className="pmt-result-note">
                This payment hash is pre-filled in step 5 so you can verify it.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══ Step 5: Verify Payment ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>5</span>
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Verify Payment</h2>
            <p className="pmt-step-desc">
              Check payment status by hash, or refresh channels to confirm balance
              changes for incoming and outgoing payments.
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
                disabled={anyBusy || !verifyHash.trim()}
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

          <div className="pmt-divider" />
          <p className="field-hint">
            For incoming payments, check your channel balance — it should increase
            after the sender pays your invoice.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={anyBusy}
            onClick={() => void runRpc("My channels", "list_channels", [{}])}
          >
            {busy("My channels") ? "Loading…" : "Refresh Channel Balances"}
          </button>
        </div>
      </section>

      {/* ══ Step 6: Close Channel ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>6</span>
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Close Channel</h2>
            <p className="pmt-step-desc">
              Settle the channel on-chain and reclaim your CKB. All off-chain
              payments are condensed into one L1 transaction.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="close-id">
              Channel ID
            </label>
            <input
              id="close-id"
              className="input input-mono"
              value={closeChannelId}
              onChange={(e) => setCloseChannelId(e.target.value)}
              placeholder="0x… (click Select in My Channels above)"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="close-args">
              Your CKB lock arg
            </label>
            <input
              id="close-args"
              className="input input-mono"
              value={closeLockArg}
              onChange={(e) => setCloseLockArg(e.target.value)}
              placeholder="0x4d4ae… (auto-filled from node info)"
              spellCheck={false}
            />
            <p className="field-hint">
              Found under <code className="code-pill">default_funding_lock_script.args</code>{" "}
              in your node info. Refreshing node info (status bar above) fills this
              automatically.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-danger-ghost"
            disabled={anyBusy || !closeChannelId.trim()}
            onClick={() => {
              const params: Record<string, unknown> = {
                channel_id: closeChannelId.trim(),
                fee_rate: "0x3FC",
              };
              if (closeLockArg.trim()) {
                params.close_script = {
                  code_hash: SECP256K1_CODE_HASH,
                  hash_type: "type",
                  args: closeLockArg.trim(),
                };
              }
              void runRpc("Close channel", "shutdown_channel", [params]);
            }}
          >
            {busy("Close channel") ? "Closing…" : "Close Channel"}
          </button>
          <p className="field-hint pmt-close-note">
            After closing, check the CKB Testnet Explorer — you will see a new
            settlement transaction to your address.
          </p>
        </div>
      </section>

      {/* ── Activity log ── */}
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
