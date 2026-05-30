import { useCallback, useMemo, useState } from "react";
import { buildConnectPeerParams } from "../lib/connectPeerParams";
import {
  parseChannelList,
  parseGraphNodeList,
  parseNodeInfo,
  summarizeRpcResult,
  type ParsedChannelRow,
  type ParsedGraphNodeRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";
import type { NodePresenceKind } from "../lib/nodePresence";
import { NodeUnreachableBanner } from "./NodeUnreachableBanner";

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
  rpcReachable: boolean;
  nodePresence: NodePresenceKind;
  onGoToNode?: () => void;
};

export function NetworkTab({
  callFiberRpc,
  rpcReachable,
  nodePresence,
  onGoToNode,
}: NetworkTabProps) {
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(null);
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);
  const [graphNodes, setGraphNodes] = useState<ParsedGraphNodeRow[]>([]);
  const [graphFilter, setGraphFilter] = useState("");
  const [connectBusyPubkey, setConnectBusyPubkey] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState<{
    pubkey: string;
    ok: boolean;
    msg: string;
  } | null>(null);
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
        if (method === "graph_nodes") setGraphNodes(parseGraphNodeList(result));
        pushHistory({ label, ok: true, summary: summarizeRpcResult(method, result) });
        return result;
      } catch (e) {
        const msg = String(e);
        setRpcError(msg);
        setRawJson(msg);
        pushHistory({
          label,
          ok: false,
          summary: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg,
        });
        return undefined;
      } finally {
        setRpcBusy(null);
      }
    },
    [callFiberRpc, pushHistory],
  );

  const filteredGraphNodes = useMemo(() => {
    const q = graphFilter.trim().toLowerCase();
    if (!q) return graphNodes;
    return graphNodes.filter(
      (n) =>
        n.pubkey.toLowerCase().includes(q) ||
        n.nodeName.toLowerCase().includes(q),
    );
  }, [graphFilter, graphNodes]);

  const handleConnectGraphNode = async (row: ParsedGraphNodeRow) => {
    if (!row.primaryAddress) {
      setConnectMessage({
        pubkey: row.pubkey,
        ok: false,
        msg: "This node has no advertised address in the graph.",
      });
      return;
    }
    setConnectBusyPubkey(row.pubkey);
    setConnectMessage(null);
    const params = buildConnectPeerParams(row.primaryAddress, row.pubkey);
    try {
      await callFiberRpc("connect_peer", params);
      setConnectMessage({
        pubkey: row.pubkey,
        ok: true,
        msg: "Connected. Open a channel from the Channels tab if needed.",
      });
      pushHistory({
        label: "Connect peer",
        ok: true,
        summary: `Connected to ${row.pubkeyDisplay}`,
      });
    } catch (e) {
      const msg = String(e);
      setConnectMessage({ pubkey: row.pubkey, ok: false, msg });
      pushHistory({
        label: "Connect peer",
        ok: false,
        summary: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg,
      });
    } finally {
      setConnectBusyPubkey(null);
    }
  };

  const anyBusy = !!rpcBusy || connectBusyPubkey != null;
  const rpcBlocked = !rpcReachable;

  return (
    <div className="panel-stack">
      <NodeUnreachableBanner
        nodePresence={nodePresence}
        rpcReachable={rpcReachable}
        onGoToNode={onGoToNode}
      />

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

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Node info</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={rpcBlocked || anyBusy}
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

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Network graph</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={rpcBlocked || anyBusy}
            onClick={() => void runRpc("Graph nodes", "graph_nodes", [{}])}
          >
            {rpcBusy === "Graph nodes" ? "Loading…" : "Load peers"}
          </button>
        </div>
        <p className="panel-lead panel-lead-tight">
          Browse public nodes from the Fiber graph and connect with one click.
        </p>
        {graphNodes.length > 0 ? (
          <>
            <div className="field" style={{ marginTop: "0.65rem" }}>
              <label className="field-label" htmlFor="graph-filter">
                Filter by name or pubkey
              </label>
              <input
                id="graph-filter"
                className="input input-mono"
                value={graphFilter}
                onChange={(e) => setGraphFilter(e.target.value)}
                placeholder="Search…"
                spellCheck={false}
              />
            </div>
            <div className="data-table-wrap" style={{ marginTop: "0.75rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Pubkey</th>
                    <th>Addresses</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredGraphNodes.slice(0, 40).map((row) => (
                    <tr key={row.pubkey}>
                      <td>{row.nodeName}</td>
                      <td className="data-table-mono" title={row.pubkey}>
                        {row.pubkeyDisplay}
                      </td>
                      <td className="data-table-num">{row.addressCount}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={
                            rpcBlocked ||
                            !row.primaryAddress ||
                            connectBusyPubkey === row.pubkey
                          }
                          onClick={() => void handleConnectGraphNode(row)}
                        >
                          {connectBusyPubkey === row.pubkey
                            ? "Connecting…"
                            : "Connect"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredGraphNodes.length > 40 ? (
              <p className="field-hint" style={{ marginTop: "0.5rem" }}>
                Showing first 40 matches — refine your filter to narrow results.
              </p>
            ) : null}
          </>
        ) : (
          <p className="network-empty-hint">
            Click <strong>Load peers</strong> to fetch nodes from the network graph.
          </p>
        )}
        {connectMessage ? (
          <div
            className={`pmt-connect-result${connectMessage.ok ? " pmt-connect-result-ok" : " pmt-connect-result-err"}`}
            role="status"
            style={{ marginTop: "0.75rem" }}
          >
            <span className="pmt-connect-result-icon" aria-hidden>
              {connectMessage.ok ? "✓" : "✗"}
            </span>
            <span className="pmt-connect-result-msg">{connectMessage.msg}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConnectMessage(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Channels</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={rpcBlocked || anyBusy}
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
                {channels.map((row, index) => (
                  <tr
                    key={`${row.channelId || "no-channel"}-${row.peerPubkey || "no-peer"}-${row.stateLabel}-${index}`}
                  >
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
