import { useState } from "react";
import { useRpc } from "../lib/useRpc";

export type SetupConnectPeerPanelProps = {
  /** `node_info` succeeds at the configured Node API URL (local fnn or another process). */
  rpcReachable: boolean;
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
};

export function SetupConnectPeerPanel({
  rpcReachable,
  callFiberRpc,
}: SetupConnectPeerPanelProps) {
  const [customAddress, setCustomAddress] = useState("");
  const [customPubkey, setCustomPubkey] = useState("");
  const [connectResult, setConnectResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const { runRpc, rpcError, setRpcError, busy, anyBusy } = useRpc({
    callFiberRpc,
    onResult: (method) => {
      if (method === "connect_peer") {
        setConnectResult({
          ok: true,
          msg: "Connected. You can open a channel from the Channels tab when you are ready.",
        });
      }
    },
    onError: (method, msg) => {
      if (method === "connect_peer") {
        setConnectResult({ ok: false, msg });
      }
    },
  });

  const rpcBlocked = !rpcReachable;

  return (
    <section className="panel setup-callout-top">
      <h2 className="panel-title">Connect to a peer</h2>

      <p className="field-label">Dial peer (requires running node)</p>
      {rpcBlocked ? (
        <p className="field-hint field-hint-warn" role="note">
          Start your node and ensure the Node API URL in settings below answers{" "}
          <code className="code-pill">node_info</code>, then return here to connect.
        </p>
      ) : null}

      <div className="inline-field" style={{ marginTop: "0.5rem" }}>
        <input
          className="input input-mono"
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          placeholder="/ip4/… multiaddr or 02… pubkey-only"
          spellCheck={false}
          disabled={rpcBlocked}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={rpcBlocked || anyBusy || !customAddress.trim()}
          onClick={() => {
            setConnectResult(null);
            const addr = customAddress.trim();
            const pk = customPubkey.trim();
            let params: object[];
            if (addr.startsWith("/")) {
              params = pk
                ? [{ pubkey: pk, address: addr }]
                : [{ address: addr }];
            } else {
              params = [{ pubkey: addr }];
            }
            void runRpc("Connect peer", "connect_peer", params);
          }}
        >
          {busy("Connect peer") ? "Connecting…" : "Connect"}
        </button>
      </div>
      {customAddress.trim().startsWith("/") ? (
        <div className="inline-field" style={{ marginTop: "0.35rem" }}>
          <input
            className="input input-mono"
            value={customPubkey}
            onChange={(e) => setCustomPubkey(e.target.value)}
            placeholder="Peer pubkey (02… or 03… hex) — required with multiaddr"
            spellCheck={false}
            disabled={rpcBlocked}
          />
        </div>
      ) : null}
      {customAddress.trim().startsWith("/") && !customPubkey.trim() ? (
        <p className="field-hint field-hint-warn" style={{ marginTop: "0.25rem" }}>
          Fiber&apos;s RPC expects the peer pubkey next to a multiaddr — it is not encoded in the{" "}
          <code>Qm…</code> segment alone.
        </p>
      ) : null}

      {rpcError ? (
        <div className="network-inline-error" role="alert" style={{ marginTop: "0.65rem" }}>
          <strong className="network-inline-error-title">Last RPC error</strong>
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
      ) : null}

      {connectResult ? (
        <div
          className={`pmt-connect-result${connectResult.ok ? " pmt-connect-result-ok" : " pmt-connect-result-err"}`}
          role="status"
          style={{ marginTop: "0.65rem" }}
        >
          <span className="pmt-connect-result-icon" aria-hidden>
            {connectResult.ok ? "✓" : "✗"}
          </span>
          <span className="pmt-connect-result-msg">{connectResult.msg}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConnectResult(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </section>
  );
}
