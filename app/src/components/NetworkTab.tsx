import { useCallback, useState } from "react";
import {
  parseChannelList,
  parseNodeInfo,
  summarizeRpcResult,
  type ParsedChannelRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";

const HISTORY_CAP = 16;

type RpcHistoryItem = {
  id: string;
  at: number;
  label: string;
  ok: boolean;
  summary: string;
};

export type NetworkTabProps = {
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function NetworkTab({ callFiberRpc }: NetworkTabProps) {
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(null);
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);
  const [history, setHistory] = useState<RpcHistoryItem[]>([]);
  const [rawJson, setRawJson] = useState<string>("");

  const pushHistory = useCallback(
    (entry: Omit<RpcHistoryItem, "id" | "at">) => {
      setHistory((h) =>
        [
          {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
        if (method === "node_info") setNodeSummary(parseNodeInfo(result));
        if (method === "list_channels") setChannels(parseChannelList(result));
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

  const anyBusy = !!rpcBusy;

  return (
    <div className="panel-stack">
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

      {/* Node info */}
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Node info</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={anyBusy}
            onClick={() => void runRpc("Node info", "node_info", [])}
          >
            {rpcBusy === "Node info" ? "Loading…" : "Refresh"}
          </button>
        </div>
        {nodeSummary ? (
          <div className="network-stat-grid">
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
                  {" "}({nodeSummary.pendingChannelCount} pending)
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="network-empty-hint">
            Click <strong>Refresh</strong> to load version, pubkey, peer count, and
            channel count.
          </p>
        )}
      </section>

      {/* Channels */}
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Channels</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={anyBusy}
            onClick={() => void runRpc("My channels", "list_channels", [{}])}
          >
            {rpcBusy === "My channels" ? "Loading…" : "Refresh"}
          </button>
        </div>
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
                    <td className="data-table-mono" title={row.peerPubkey}>
                      {row.peerDisplay}
                    </td>
                    <td className="data-table-state">
                      {row.stateLabel.replace("CHANNEL_", "")}
                    </td>
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
                        {row.isUdt ? (
                          <span className="network-badge network-badge-muted">
                            UDT
                          </span>
                        ) : null}
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
            Click <strong>Refresh</strong> to list your channels.
          </p>
        )}
      </section>

      {/* Recent activity */}
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent activity</h2>
          <span className="panel-meta">{history.length} calls</span>
        </div>
        {history.length > 0 ? (
          <ul className="network-history" aria-label="RPC history">
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
        ) : (
          <p className="network-empty-hint">No calls yet this session.</p>
        )}
        <details className="network-raw-details">
          <summary>Raw JSON (last response)</summary>
          <textarea
            className="response-view response-view-short"
            readOnly
            value={rawJson}
            spellCheck={false}
            placeholder="Raw responses appear here."
            aria-label="Raw JSON response"
          />
        </details>
      </section>
    </div>
  );
}
