import { useCallback, useState } from "react";
import type { NetworkId } from "../lib/publicNodes";
import {
  parseChannelList,
  parseGraphNodeList,
  parseNodeInfo,
  pickInvoiceAddress,
  summarizeRpcResult,
  type ParsedChannelRow,
  type ParsedGraphNodeRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";

const HISTORY_CAP = 16;

/** ~1 CKB (invoice / small tests) */
const PRESET_INVOICE_1_CKB = "0x5f5e100";
/** ~10 CKB */
const PRESET_INVOICE_10_CKB = "0x3b9aca00";
/** Default from public-nodes walkthrough (~medium funding) */
const PRESET_CHANNEL_DEFAULT = "0xb9e459300";
/** ~100 CKB */
const PRESET_CHANNEL_100_CKB = "0x2540be400";

type RpcHistoryItem = {
  id: string;
  at: number;
  label: string;
  method: string;
  ok: boolean;
  summary: string;
};

export type NetworkTabProps = {
  netId: NetworkId;
  nodeKeys: { node1: string; node2: string };
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function NetworkTab({
  netId,
  nodeKeys,
  callFiberRpc,
}: NetworkTabProps) {
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(
    null,
  );
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);
  const [graphNodes, setGraphNodes] = useState<ParsedGraphNodeRow[]>([]);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [history, setHistory] = useState<RpcHistoryItem[]>([]);
  const [rawJson, setRawJson] = useState<string>("");

  const [channelFunding, setChannelFunding] = useState(PRESET_CHANNEL_DEFAULT);
  const [invoiceAmount, setInvoiceAmount] = useState(PRESET_INVOICE_1_CKB);
  const [paymentInvoice, setPaymentInvoice] = useState("");

  const pushHistory = useCallback(
    (entry: Omit<RpcHistoryItem, "id" | "at">) => {
      const item: RpcHistoryItem = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: Date.now(),
      };
      setHistory((h) => [item, ...h].slice(0, HISTORY_CAP));
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
          setNodeSummary(parseNodeInfo(result));
        }
        if (method === "list_channels") {
          setChannels(parseChannelList(result));
        }
        if (method === "graph_nodes") {
          setGraphNodes(parseGraphNodeList(result));
        }
        if (method === "new_invoice") {
          setLastInvoice(pickInvoiceAddress(result));
        }

        pushHistory({
          label,
          method,
          ok: true,
          summary: summarizeRpcResult(method, result),
        });
      } catch (e) {
        const msg = String(e);
        setRpcError(msg);
        setRawJson(msg);
        pushHistory({
          label,
          method,
          ok: false,
          summary: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg,
        });
      } finally {
        setRpcBusy(null);
      }
    },
    [callFiberRpc, pushHistory],
  );

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const currency = netId === "mainnet" ? "Fibb" : "Fibt";

  return (
    <div className="panel-stack network-layout">
      <section className="panel network-actions-panel">
        <h2 className="panel-title">Actions</h2>

        {rpcError ? (
          <div className="network-inline-error" role="alert">
            <strong className="network-inline-error-title">Last request failed</strong>
            <p className="network-inline-error-body">{rpcError}</p>
          </div>
        ) : null}

        <h3 className="subhead">Status & data</h3>
        <div className="chip-actions">
          <button
            type="button"
            className="btn btn-chip"
            disabled={!!rpcBusy}
            onClick={() => void runRpc("Node info", "node_info", [])}
          >
            {rpcBusy === "Node info" ? "…" : "Refresh node info"}
          </button>
          <button
            type="button"
            className="btn btn-chip"
            disabled={!!rpcBusy}
            onClick={() =>
              void runRpc("My channels", "list_channels", [{}])
            }
          >
            {rpcBusy === "My channels" ? "…" : "Refresh channels"}
          </button>
          <button
            type="button"
            className="btn btn-chip"
            disabled={!!rpcBusy}
            onClick={() =>
              void runRpc("Network map", "graph_nodes", { limit: 50 })
            }
          >
            {rpcBusy === "Network map" ? "…" : "Load network graph"}
          </button>
        </div>
        <p className="field-hint network-actions-hint">
          Uses Setup → Node API; refresh after changes. Relays:{" "}
          <a
            className="inline-link"
            href="https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md"
            target="_blank"
            rel="noreferrer"
          >
            public nodes
          </a>
          .
        </p>

        <h3 className="subhead">Public relays ({netId})</h3>
        <div className="chip-actions">
          <button
            type="button"
            className="btn btn-chip"
            disabled={!!rpcBusy}
            title={nodeKeys.node1}
            onClick={() =>
              void runRpc("Connect relay 1", "connect_peer", [
                { pubkey: nodeKeys.node1 },
              ])
            }
          >
            {rpcBusy === "Connect relay 1" ? "…" : "Connect relay 1"}
          </button>
          <button
            type="button"
            className="btn btn-chip"
            disabled={!!rpcBusy}
            title={nodeKeys.node2}
            onClick={() =>
              void runRpc("Connect relay 2", "connect_peer", [
                { pubkey: nodeKeys.node2 },
              ])
            }
          >
            {rpcBusy === "Connect relay 2" ? "…" : "Connect relay 2"}
          </button>
        </div>

        <h3 className="subhead">Channels & payments</h3>
        <div className="rpc-form-blocks">
          <div className="rpc-form-block">
            <label className="field">
              <span className="field-label">Open channel — funding amount</span>
              <div className="amount-preset-row" aria-label="Amount presets">
                <span className="amount-preset-label">Presets:</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setChannelFunding(PRESET_CHANNEL_DEFAULT)}
                >
                  Default walkthrough
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setChannelFunding(PRESET_CHANNEL_100_CKB)}
                >
                  ~100 CKB
                </button>
              </div>
              <div className="inline-field">
                <input
                  className="input input-mono"
                  value={channelFunding}
                  onChange={(e) => setChannelFunding(e.target.value)}
                  spellCheck={false}
                  title="Hex u128, shannons (same style as ckb-cli)."
                  aria-describedby="network-open-channel-hint"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!!rpcBusy}
                  onClick={() => {
                    const amt = channelFunding.trim();
                    void runRpc("Open channel", "open_channel", [
                      {
                        pubkey: nodeKeys.node1,
                        funding_amount: amt,
                        public: true,
                      },
                    ]);
                  }}
                >
                  Open to relay 1
                </button>
              </div>
            </label>
            <p className="field-hint" id="network-open-channel-hint">
              Connect to a relay first; start with a small amount on testnet.
            </p>
          </div>
          <div className="rpc-form-block">
            <label className="field">
              <span className="field-label">New invoice — amount (hex)</span>
              <div className="amount-preset-row">
                <span className="amount-preset-label">Presets:</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setInvoiceAmount(PRESET_INVOICE_1_CKB)}
                >
                  ~1 CKB
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setInvoiceAmount(PRESET_INVOICE_10_CKB)}
                >
                  ~10 CKB
                </button>
              </div>
              <div className="inline-field">
                <input
                  className="input input-mono"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!!rpcBusy}
                  onClick={() =>
                    void runRpc("Create invoice", "new_invoice", [
                      {
                        amount: invoiceAmount.trim(),
                        currency,
                        description: "fiber-desktop",
                      },
                    ])
                  }
                >
                  Create invoice
                </button>
              </div>
            </label>
            {lastInvoice ? (
              <p className="field-hint network-invoice-row">
                <span>Latest invoice:</span>{" "}
                <code className="code-pill code-pill-break">{lastInvoice}</code>{" "}
                <button
                  type="button"
                  className="inline-link inline-link-button"
                  onClick={() => void copyText(lastInvoice)}
                >
                  Copy
                </button>
              </p>
            ) : null}
          </div>
          <div className="rpc-form-block">
            <label className="field">
              <span className="field-label">Send payment — paste invoice</span>
              <div className="inline-field">
                <input
                  className="input input-mono"
                  value={paymentInvoice}
                  onChange={(e) => setPaymentInvoice(e.target.value)}
                  placeholder="fiber1…"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!!rpcBusy || !paymentInvoice.trim()}
                  onClick={() =>
                    void runRpc("Send payment", "send_payment", [
                      { invoice: paymentInvoice.trim() },
                    ])
                  }
                >
                  Send payment
                </button>
              </div>
            </label>
            <p className="field-hint">
              Only pay invoices you trust—there is no undo once routed.
            </p>
          </div>
        </div>
      </section>

      <section className="panel panel-sticky-response network-dashboard-panel">
        <div className="panel-head">
          <h2 className="panel-title">At a glance</h2>
          <span className="panel-meta">
            {rpcBusy ? "Working…" : rpcError ? "Error" : "Ready"}
          </span>
        </div>

        {nodeSummary ? (
          <div className="network-stat-grid" aria-label="Node summary">
            <div className="network-stat-card">
              <span className="network-stat-label">Version</span>
              <span className="network-stat-value">{nodeSummary.version}</span>
            </div>
            <div className="network-stat-card">
              <span className="network-stat-label">Your pubkey</span>
              <span
                className="network-stat-value network-stat-mono"
                title={nodeSummary.pubkey}
              >
                {nodeSummary.pubkeyDisplay}
              </span>
            </div>
            <div className="network-stat-card">
              <span className="network-stat-label">Peers</span>
              <span className="network-stat-value">{nodeSummary.peersCount}</span>
            </div>
            <div className="network-stat-card">
              <span className="network-stat-label">Channels</span>
              <span className="network-stat-value">
                {nodeSummary.channelCount}
                <span className="network-stat-sub">
                  {" "}
                  ({nodeSummary.pendingChannelCount} pending)
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="network-empty-hint">
            Run <strong>Refresh node info</strong> to show version, pubkey, and
            counts here.
          </p>
        )}

        <h3 className="subhead network-subhead-tight">Your channels</h3>
        {channels.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peer</th>
                  <th>State</th>
                  <th>Local</th>
                  <th>Remote</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row) => (
                  <tr key={row.channelId || row.peerPubkey + row.stateLabel}>
                    <td
                      className="data-table-mono"
                      title={row.peerPubkey}
                    >
                      {row.peerDisplay}
                    </td>
                    <td className="data-table-state">{row.stateLabel}</td>
                    <td className="data-table-num">{row.localBalance}</td>
                    <td className="data-table-num">{row.remoteBalance}</td>
                    <td>
                      <span className="network-tag-wrap">
                        {row.isPublic ? (
                          <span className="network-badge">Public</span>
                        ) : (
                          <span className="network-badge network-badge-muted">
                            Private
                          </span>
                        )}
                        {!row.enabled ? (
                          <span className="network-badge network-badge-warn">
                            Off
                          </span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="network-empty-hint">
            Run <strong>Refresh channels</strong> to list negotiating and open
            channels.
          </p>
        )}

        <h3 className="subhead network-subhead-tight">Graph nodes (sample)</h3>
        {graphNodes.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Pubkey</th>
                  <th>Ver</th>
                  <th>Addrs</th>
                </tr>
              </thead>
              <tbody>
                {graphNodes.slice(0, 40).map((row) => (
                  <tr key={row.pubkey}>
                    <td>{row.nodeName}</td>
                    <td className="data-table-mono" title={row.pubkey}>
                      {row.pubkeyDisplay}
                    </td>
                    <td className="data-table-muted">{row.version}</td>
                    <td className="data-table-num">{row.addressCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="network-empty-hint">
            Run <strong>Load network graph</strong> to preview announced nodes
            (first page).
          </p>
        )}

        <h3 className="subhead network-subhead-tight">Recent activity</h3>
        {history.length > 0 ? (
          <ul className="network-history" aria-label="RPC history">
            {history.map((h) => (
              <li key={h.id} className="network-history-item">
                <span
                  className={
                    h.ok ? "network-history-ok" : "network-history-err"
                  }
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
        ) : (
          <p className="network-empty-hint">No calls yet this session.</p>
        )}

        <details className="network-raw-details">
          <summary>Raw JSON (technical)</summary>
          <textarea
            className="response-view response-view-short"
            readOnly
            value={rawJson}
            spellCheck={false}
            placeholder="Successful responses and errors both land here for debugging."
            aria-label="Raw JSON response"
          />
        </details>
      </section>
    </div>
  );
}
