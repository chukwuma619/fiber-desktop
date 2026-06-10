import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChannelPolling } from "../hooks/useChannelPolling";
import { useCopyWithFeedback } from "../hooks/useCopyWithFeedback";
import { recordActivity } from "../lib/activityHistory";
import { buildConnectPeerParams } from "../lib/connectPeerParams";
import {
  channelStateBadgeClass,
  findOpeningChannel,
  formatChannelStateForDisplay,
  isChannelReady,
  parseChannelList,
  parseNodeInfo,
  type ParsedChannelRow,
  type ParsedNodeSummary,
} from "../lib/networkRpcParse";
import { ckbAmountToShannonsHex } from "../lib/ckbAmount";
import { PUBLIC_NODES, type NetworkId } from "../lib/publicNodes";
import { sendDesktopNotification } from "../lib/desktopNotify";
import { fiberRpcErrorFromInvoke } from "../lib/fiberRpcError";
import { formatRpcUserError } from "../lib/rpcUserError";
import { useRpc } from "../lib/useRpc";

const SECP256K1_CODE_HASH =
  "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type OpenPhase = "idle" | "connecting" | "opening";

export type PaymentsTabProps = {
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
  rpcReachable: boolean;
  network: NetworkId;
};

export function PaymentsTab({
  callFiberRpc,
  rpcReachable,
  network,
}: PaymentsTabProps) {
  const [nodeSummary, setNodeSummary] = useState<ParsedNodeSummary | null>(null);
  const [channels, setChannels] = useState<ParsedChannelRow[]>([]);

  const [peerAddress, setPeerAddress] = useState("");
  const [peerPubkey, setPeerPubkey] = useState("");
  const [fundingCkb, setFundingCkb] = useState("500");
  const [openTempId, setOpenTempId] = useState<string | null>(null);
  const [openingPeerPubkey, setOpeningPeerPubkey] = useState("");
  const [openPhase, setOpenPhase] = useState<OpenPhase>("idle");

  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  const [closeRowBusy, setCloseRowBusy] = useState<string | null>(null);
  const [closeRowMessage, setCloseRowMessage] = useState<{
    channelId: string;
    ok: boolean;
    msg: string;
  } | null>(null);

  const [channelsLastFetched, setChannelsLastFetched] = useState<Date | null>(null);
  const [channelsFetchedCount, setChannelsFetchedCount] = useState<number | null>(
    null
  );

  const handleListChannels = useCallback((result: unknown) => {
    const parsed = parseChannelList(result);
    setChannels(parsed);
    setChannelsLastFetched(new Date());
    setChannelsFetchedCount(parsed.length);
    return parsed;
  }, []);

  const { runRpc, rpcError, setRpcError, history, rawJson, busy, anyBusy } =
    useRpc({
      callFiberRpc,
      formatError: formatRpcUserError,
      onResult: (method, result) => {
        if (method === "node_info") {
          const parsed = parseNodeInfo(result);
          setNodeSummary(parsed);
        }
        if (method === "list_channels") {
          handleListChannels(result);
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

  const refreshChannels = useCallback(() => {
    void runRpc("My channels", "list_channels", [{}]);
  }, [runRpc]);

  const refreshNodeInfo = useCallback(() => {
    void runRpc("Node info", "node_info", []);
  }, [runRpc]);

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    refreshNodeInfo();
    refreshChannels();
  }, [refreshNodeInfo, refreshChannels]);

  useEffect(() => {
    const peer = openingPeerPubkey.trim();
    if (!peer) return;
    const match = findOpeningChannel(channels, openTempId, peer);
    if (match && isChannelReady(match.stateLabel)) {
      setOpenTempId(null);
    }
  }, [channels, openTempId, openingPeerPubkey]);

  const openingChannel = useMemo(
    () => findOpeningChannel(channels, openTempId, openingPeerPubkey),
    [channels, openTempId, openingPeerPubkey]
  );

  const openingIsReady = openingChannel
    ? isChannelReady(openingChannel.stateLabel)
    : false;

  const shouldPoll =
    Boolean(openingPeerPubkey.trim()) &&
    (Boolean(openTempId) || Boolean(openingChannel)) &&
    !openingIsReady;

  const { isPolling, timedOut } = useChannelPolling({
    active: shouldPoll,
    onPoll: refreshChannels,
  });

  const { copy, copyFeedback } = useCopyWithFeedback();

  const relays = PUBLIC_NODES[network];
  const fundingHex = ckbAmountToShannonsHex(fundingCkb);
  const needsPubkeyWithAddr =
    peerAddress.trim().startsWith("/") && !peerPubkey.trim();

  const openBanner = useMemo(() => {
    if (!openingPeerPubkey.trim() && !openTempId) return null;
    if (timedOut) {
      return {
        kind: "err" as const,
        label: "Still waiting for confirmation",
        note:
          "This is taking longer than usual. Check the CKB testnet explorer or try refreshing your channels.",
      };
    }
    if (openingIsReady) {
      return {
        kind: "ok" as const,
        label: "Channel ready",
        note: "Your channel is open. You can send payments on the Send tab.",
      };
    }
    if (openingChannel) {
      return {
        kind: "pending" as const,
        label: "Opening channel…",
        note: "Your channel is being set up on-chain. This page updates automatically.",
      };
    }
    return {
      kind: "pending" as const,
      label: "Waiting for on-chain confirmation",
      note: "Your channel request was sent. This page updates automatically when it appears below.",
    };
  }, [
    openingPeerPubkey,
    openTempId,
    timedOut,
    openingIsReady,
    openingChannel,
  ]);

  const handleOpenChannel = async () => {
    const pk = peerPubkey.trim();
    const funding = ckbAmountToShannonsHex(fundingCkb);
    if (!pk || !funding) return;

    setRpcError(null);
    setOpeningPeerPubkey(pk);
    setOpenTempId(null);

    const connectParams = buildConnectPeerParams(peerAddress, peerPubkey);
    if (connectParams.length === 0) {
      setRpcError("Enter a peer public key or network address.");
      return;
    }

    setOpenPhase("connecting");
    const connectResult = await runRpc("Connect peer", "connect_peer", connectParams);
    if (connectResult === undefined) {
      setOpenPhase("idle");
      return;
    }

    setOpenPhase("opening");
    const openResult = await runRpc("Open channel", "open_channel", [
      { pubkey: pk, funding_amount: funding, public: true },
    ]);
    setOpenPhase("idle");
    if (openResult === undefined) return;

    recordActivity({
      kind: "channel_opened",
      title: "Channel opening",
      detail: pk,
      amountCkb: fundingCkb.trim(),
    });
    void sendDesktopNotification(
      "Channel opening",
      `Opening channel with ${pk.slice(0, 12)}…`,
    );
    refreshChannels();
  };

  const handleCloseChannel = async (row: ParsedChannelRow) => {
    setCloseRowMessage(null);
    setCloseRowBusy(row.channelId);

    let lockArg = nodeSummary?.lockArg ?? "";
    if (!lockArg) {
      try {
        const result = await callFiberRpc("node_info", []);
        const parsed = parseNodeInfo(result);
        if (parsed) {
          setNodeSummary(parsed);
          lockArg = parsed.lockArg;
        }
      } catch (e) {
        setCloseRowMessage({
          channelId: row.channelId,
          ok: false,
          msg: formatRpcUserError("node_info", fiberRpcErrorFromInvoke(e)),
        });
        setCloseRowBusy(null);
        setCloseConfirmId(null);
        return;
      }
    }

    const params: Record<string, unknown> = {
      channel_id: row.channelId,
      fee_rate: "0x3FC",
    };
    if (lockArg.trim()) {
      params.close_script = {
        code_hash: SECP256K1_CODE_HASH,
        hash_type: "type",
        args: lockArg.trim(),
      };
    }

    try {
      await callFiberRpc("shutdown_channel", [params]);
      recordActivity({
        kind: "channel_closed",
        title: "Channel close requested",
        detail: row.peerPubkey,
      });
      void sendDesktopNotification(
        "Channel closing",
        "Close requested — funds will settle on-chain.",
      );
      setCloseRowMessage({
        channelId: row.channelId,
        ok: true,
        msg: "Close requested. Funds settle on-chain — check the explorer in a few minutes.",
      });
      setCloseConfirmId(null);
      refreshChannels();
    } catch (e) {
      setCloseRowMessage({
        channelId: row.channelId,
        ok: false,
        msg: formatRpcUserError(
          "shutdown_channel",
          fiberRpcErrorFromInvoke(e),
        ),
      });
    } finally {
      setCloseRowBusy(null);
    }
  };

  const rpcBlocked = !rpcReachable;
  const openBusy = openPhase !== "idle" || anyBusy;

  return (
    <div className="pmt-layout">
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
              Refresh status to see your node summary.
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={anyBusy}
          onClick={refreshNodeInfo}
        >
          {busy("Node info") ? "Loading…" : "Refresh status"}
        </button>
      </div>

      {rpcError && (
        <div className="network-inline-error" role="alert">
          <strong className="network-inline-error-title">Something went wrong</strong>
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
            <h2 className="pmt-step-title">Open a channel</h2>
            <p className="pmt-step-desc">
              Enter your peer&apos;s address and public key — we&apos;ll connect and
              open the channel for you in one step.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          {rpcBlocked ? (
            <p className="field-hint field-hint-warn" role="note">
              Start your node first, then return here to open a channel.
            </p>
          ) : null}

          <div className="pmt-relay-buttons">
            <span className="pmt-relay-prefix">Quick pick ({network}):</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={rpcBlocked || openBusy}
              onClick={() => {
                setPeerAddress(relays.node1.address);
                setPeerPubkey(relays.node1.pubkey);
              }}
            >
              Relay 1
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={rpcBlocked || openBusy}
              onClick={() => {
                setPeerAddress(relays.node2.address);
                setPeerPubkey(relays.node2.pubkey);
              }}
            >
              Relay 2
            </button>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="open-peer-address">
              Peer network address (optional)
            </label>
            <input
              id="open-peer-address"
              className="input input-mono"
              value={peerAddress}
              onChange={(e) => setPeerAddress(e.target.value)}
              placeholder="/ip4/… or leave empty if using pubkey only"
              spellCheck={false}
              disabled={rpcBlocked}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="open-pubkey">
              Peer public key
            </label>
            <input
              id="open-pubkey"
              className="input input-mono"
              value={peerPubkey}
              onChange={(e) => setPeerPubkey(e.target.value)}
              placeholder="02… or 03…"
              spellCheck={false}
              disabled={rpcBlocked}
            />
            {needsPubkeyWithAddr ? (
              <p className="field-hint field-hint-warn">
                A public key is required when using a network address.
              </p>
            ) : null}
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
                disabled={rpcBlocked}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  rpcBlocked ||
                  openBusy ||
                  !peerPubkey.trim() ||
                  needsPubkeyWithAddr ||
                  fundingHex === null
                }
                onClick={() => void handleOpenChannel()}
              >
                {openPhase === "connecting"
                  ? "Connecting…"
                  : openPhase === "opening"
                    ? "Opening…"
                    : "Open channel"}
              </button>
            </div>
            <p className="field-hint">
              Amount of CKB to lock in this channel (up to 8 decimal places). Many
              peers require hundreds of CKB — check their minimum.
              {fundingCkb.trim() && fundingHex === null ? (
                <span className="field-hint-warn"> Fix the amount to continue.</span>
              ) : null}
            </p>
          </div>

          <details className="pmt-advanced-details">
            <summary>Advanced details</summary>
            <p className="field-hint">
              Funding (shannons hex):{" "}
              <code className="code-pill">{fundingHex ?? "—"}</code>
            </p>
            {openTempId ? (
              <p className="field-hint">
                Temporary channel ID:{" "}
                <code className="code-pill code-pill-break">{openTempId}</code>
              </p>
            ) : null}
            {openingChannel ? (
              <p className="field-hint">
                Raw state:{" "}
                <code className="code-pill">{openingChannel.stateLabel}</code>
              </p>
            ) : null}
          </details>

          {openBanner ? (
            <div
              className={`pmt-result${
                openBanner.kind === "ok"
                  ? " pmt-result-ok"
                  : openBanner.kind === "pending"
                    ? " pmt-result-pending"
                    : " pmt-connect-result-err"
              }`}
              role="status"
            >
              <div
                className={
                  openBanner.kind === "pending" ? "pmt-result-pending-head" : undefined
                }
              >
                {openBanner.kind === "pending" ? (
                  <span className="guided-spinner" aria-hidden />
                ) : null}
                <span className="pmt-result-label">{openBanner.label}</span>
              </div>
              {openTempId && openBanner.kind !== "ok" ? (
                <div className="pmt-result-row">
                  <code className="code-pill code-pill-break">{openTempId}</code>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void copy(openTempId)}
                  >
                    Copy ID
                  </button>
                  {copyFeedback ? (
                    <span className="save-toast" role="status">
                      {copyFeedback}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <p className="pmt-result-note">{openBanner.note}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">My channels</h2>
            <p className="pmt-step-desc">
              Channels you have opened. Use <strong>Close</strong> to settle on-chain
              and reclaim your CKB.
            </p>
          </div>
        </div>

        <div className="pmt-step-body">
          <div className="pmt-refresh-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={anyBusy}
              onClick={refreshChannels}
            >
              {busy("My channels") ? "Loading…" : "Refresh channels"}
            </button>
            {isPolling ? (
              <span className="pmt-refresh-stamp">Auto-refreshing…</span>
            ) : null}
            {channelsLastFetched && !busy("My channels") && !isPolling ? (
              <span className="pmt-refresh-stamp">
                {channelsFetchedCount === 0
                  ? `Updated ${channelsLastFetched.toLocaleTimeString()} — no channels yet`
                  : `Updated ${channelsLastFetched.toLocaleTimeString()} — ${channelsFetchedCount} channel${channelsFetchedCount === 1 ? "" : "s"}`}
              </span>
            ) : null}
          </div>

          {channels.length > 0 ? (
            <div className="data-table-wrap pmt-channel-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Peer</th>
                    <th>State</th>
                    <th>Local</th>
                    <th>Remote</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row, index) => {
                    const canClose = isChannelReady(row.stateLabel);
                    const isConfirming = closeConfirmId === row.channelId;
                    const isClosing = closeRowBusy === row.channelId;
                    const rowMsg =
                      closeRowMessage?.channelId === row.channelId
                        ? closeRowMessage
                        : null;

                    return (
                      <tr
                        key={`${row.channelId || "no-channel"}-${row.peerPubkey || "no-peer"}-${index}`}
                      >
                        <td
                          className="data-table-mono"
                          title={row.peerPubkey}
                        >
                          {row.peerDisplay}
                        </td>
                        <td>
                          <span className={channelStateBadgeClass(row.stateLabel)}>
                            {formatChannelStateForDisplay(row.stateLabel)}
                          </span>
                        </td>
                        <td className="data-table-num">{row.localBalance}</td>
                        <td className="data-table-num">{row.remoteBalance}</td>
                        <td>
                          <span className="network-badge network-badge-muted">
                            {row.isUdt ? "UDT" : "CKB"}
                          </span>
                        </td>
                        <td className="pmt-row-actions">
                          {isConfirming ? (
                            <div className="pmt-close-confirm">
                              <span className="pmt-close-confirm-text">
                                Close channel with {row.peerDisplay}?
                              </span>
                              <div className="pmt-close-confirm-btns">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  disabled={isClosing}
                                  onClick={() => setCloseConfirmId(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger-ghost btn-sm"
                                  disabled={isClosing}
                                  onClick={() => void handleCloseChannel(row)}
                                >
                                  {isClosing ? "Closing…" : "Close channel"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-danger-ghost btn-sm"
                                disabled={
                                  !canClose || isClosing || anyBusy
                                }
                                title={
                                  canClose
                                    ? "Settle this channel on-chain"
                                    : "Available when channel is ready"
                                }
                                onClick={() => {
                                  setCloseConfirmId(row.channelId);
                                  setCloseRowMessage(null);
                                }}
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                title="Copy channel ID"
                                onClick={() => void copy(row.channelId)}
                              >
                                Copy ID
                              </button>
                            </>
                          )}
                          {rowMsg ? (
                            <p
                              className={
                                rowMsg.ok
                                  ? "field-hint pmt-row-msg-ok"
                                  : "field-hint field-hint-warn pmt-row-msg"
                              }
                              role="status"
                            >
                              {rowMsg.msg}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="network-empty-hint pmt-empty-hint">
              {channelsLastFetched
                ? "No channels yet — if you just opened one, it may still be confirming on-chain. This list updates automatically."
                : "Loading your channels…"}
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
