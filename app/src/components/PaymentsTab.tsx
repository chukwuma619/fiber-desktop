import { useState } from "react";
import { useCopyWithFeedback } from "../hooks/useCopyWithFeedback";
import {
  parseChannelList,
  parseNodeInfo,
  type ParsedChannelRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";
import { useRpc } from "../lib/useRpc";

const SECP256K1_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

const SHANNONS_PER_CKB = 100_000_000n;

/** Parse human CKB (e.g. `500`, `400.5`, up to 8 decimal places) → `0x…` shannons hex for RPC. */
function ckbAmountToFundingHex(ckbText: string): string | null {
  const t = ckbText.trim().replace(/,/g, "");
  if (!t) return null;
  const m = /^(\d+)(?:\.(\d{1,8}))?$/.exec(t);
  if (!m) return null;
  const whole = BigInt(m[1]);
  const fracStr = m[2] ?? "";
  if (fracStr.length > 8) return null;
  const fracShannons =
    fracStr === "" ? 0n : BigInt(fracStr) * 10n ** (8n - BigInt(fracStr.length));
  const shannons = whole * SHANNONS_PER_CKB + fracShannons;
  if (shannons <= 0n) return null;
  return `0x${shannons.toString(16)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type PaymentsTabProps = {
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function PaymentsTab({ callFiberRpc }: PaymentsTabProps) {
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(null);

  // Channels
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);

  // Step 1: Open Channel
  const [openPubkey, setOpenPubkey] = useState("");
  const [fundingCkb, setFundingCkb] = useState("500");
  const [openTempId, setOpenTempId] = useState<string | null>(null);

  // Step 3: Close Channel
  const [closeChannelId, setCloseChannelId] = useState("");
  const [closeLockArg, setCloseLockArg] = useState("");

  // Track whether list_channels has ever been called and what it last returned
  const [channelsLastFetched, setChannelsLastFetched] = useState<Date | null>(null);
  const [channelsFetchedCount, setChannelsFetchedCount] = useState<number | null>(null);

  const { runRpc, rpcError, setRpcError, history, rawJson, busy, anyBusy } =
    useRpc({
      callFiberRpc,
      onResult: (method, result) => {
        if (method === "node_info") {
          const parsed = parseNodeInfo(result);
          setNodeSummary(parsed);
          if (parsed?.lockArg) setCloseLockArg(parsed.lockArg);
        }
        if (method === "list_channels") {
          const parsed = parseChannelList(result);
          setChannels(parsed);
          setChannelsLastFetched(new Date());
          setChannelsFetchedCount(parsed.length);
        }
        if (method === "open_channel" && isRecord(result)) {
          const tempId =
            typeof result.temporary_channel_id === "string"
              ? result.temporary_channel_id
              : null;
          if (tempId) setOpenTempId(tempId);
        }
      },
    });

  const { copy, copyFeedback } = useCopyWithFeedback();

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
              After you connect to a peer under <strong>Setup</strong>, lock CKB here to
              open a payment channel.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <p className="field-hint" style={{ marginBottom: "0.85rem" }}>
            Use <strong>Setup → Connect to a peer</strong> first so the handshake completes
            before you open a channel.
          </p>

          {/* Fund channel */}
          <div className="pmt-substep">
            <span className="pmt-substep-label">Peer pubkey & funding</span>
            <div className="field">
              <label className="field-label" htmlFor="open-pubkey">
                Peer pubkey
              </label>
              <input
                id="open-pubkey"
                className="input input-mono"
                value={openPubkey}
                onChange={(e) => setOpenPubkey(e.target.value)}
                placeholder="02… (same pubkey you connected to in Setup)"
                spellCheck={false}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="open-funding-ckb">
                Funding amount (CKB)
              </label>
              <div className="inline-field">
                <input
                  id="open-funding-ckb"
                  className="input"
                  inputMode="decimal"
                  value={fundingCkb}
                  onChange={(e) => setFundingCkb(e.target.value)}
                  placeholder="e.g. 500 or 400.25"
                  spellCheck={false}
                  aria-describedby="open-funding-hint"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    anyBusy ||
                    !openPubkey.trim() ||
                    ckbAmountToFundingHex(fundingCkb) === null
                  }
                  onClick={() => {
                    const fundingHex = ckbAmountToFundingHex(fundingCkb);
                    if (!fundingHex) return;
                    void runRpc("Open channel", "open_channel", [
                      {
                        pubkey: openPubkey.trim(),
                        funding_amount: fundingHex,
                        public: true,
                      },
                    ]);
                  }}
                >
                  {busy("Open channel") ? "Opening…" : "Open Channel"}
                </button>
              </div>
              <p id="open-funding-hint" className="field-hint">
                Enter CKB to lock in the channel (up to 8 decimal places). Many peers
                require hundreds of CKB for auto-accept — check their minimum. Sent to
                RPC as shannons hex:{" "}
                <code className="code-pill">
                  {ckbAmountToFundingHex(fundingCkb) ?? "—"}
                </code>
                {fundingCkb.trim() && ckbAmountToFundingHex(fundingCkb) === null ? (
                  <span className="field-hint-warn"> (fix the amount)</span>
                ) : null}
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
                  {copyFeedback ? (
                    <span className="save-toast" role="status">
                      {copyFeedback}
                    </span>
                  ) : null}
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
              row to use it in step 3.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="pmt-refresh-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={anyBusy}
              onClick={() => void runRpc("My channels", "list_channels", [{}])}
            >
              {busy("My channels") ? "Loading…" : "Refresh Channels"}
            </button>
            {channelsLastFetched && !busy("My channels") && (
              <span className="pmt-refresh-stamp">
                {channelsFetchedCount === 0
                  ? `Refreshed at ${channelsLastFetched.toLocaleTimeString()} — 0 channels found`
                  : `Refreshed at ${channelsLastFetched.toLocaleTimeString()} — ${channelsFetchedCount} channel${channelsFetchedCount === 1 ? "" : "s"}`}
              </span>
            )}
          </div>

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
                  {channels.map((row, index) => (
                    <tr
                      key={`${row.channelId || "no-channel"}-${row.peerPubkey || "no-peer"}-${index}`}
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
              {channelsLastFetched
                ? "No channels returned — the channel may still be awaiting on-chain confirmation. Keep refreshing."
                : "No channels loaded yet — click Refresh Channels."}
            </p>
          )}
        </div>
      </section>

      {/* ══ Step 3: Close Channel ══ */}
      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <span className="pmt-step-num" aria-hidden>3</span>
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
