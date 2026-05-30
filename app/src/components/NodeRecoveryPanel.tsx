import { usePlatformLabels } from "../hooks/usePlatformLabels";
import {
  logTextIndicatesFiberStoreLock,
  type NodePresenceKind,
} from "../lib/nodePresence";
import type { FnnStatusView } from "../types/settings";

type NodeRecoveryPanelProps = {
  nodePresence: NodePresenceKind;
  fnnStatus: FnnStatusView | null;
  fnnLogs: string[];
  onSyncRuntime: () => void | Promise<void>;
};

export function NodeRecoveryPanel({
  nodePresence,
  fnnStatus,
  fnnLogs,
  onSyncRuntime,
}: NodeRecoveryPanelProps) {
  const platform = usePlatformLabels();
  const storeLock = logTextIndicatesFiberStoreLock(fnnLogs);
  const crashed = nodePresence === "crashed";

  if (!storeLock && !crashed) return null;

  if (storeLock) {
    return (
      <div className="node-recovery-panel node-recovery-panel-warn" role="alert">
        <strong className="node-recovery-panel-title">
          Data folder is already in use
        </strong>
        <p className="node-recovery-panel-body">
          Another <code className="code-pill">fnn</code> process is using the
          same data directory, so the database cannot lock. This often happens
          when Fiber Desktop was closed while the node kept running, or when a
          second window tries to start the same node.
        </p>
        <ol className="node-recovery-steps">
          <li>
            Quit duplicate Fiber Desktop windows and stop any other{" "}
            {platform.terminalHint}
            <code className="code-pill">fnn</code> using the same{" "}
            <code className="code-pill">-d</code> path.
          </li>
          <li>
            On the Node tab, click <strong>Stop</strong> if this app still owns
            a running process, then <strong>Start</strong> again.
          </li>
          <li>
            If the node runs in the background (tray), use{" "}
            <strong>Show Fiber Desktop</strong> from the tray menu first.
          </li>
        </ol>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void onSyncRuntime()}
        >
          Refresh status
        </button>
      </div>
    );
  }

  return (
    <div className="node-recovery-panel node-recovery-panel-error" role="alert">
      <strong className="node-recovery-panel-title">Node exited unexpectedly</strong>
      <p className="node-recovery-panel-body">
        fnn stopped with exit code{" "}
        <code className="code-pill">{fnnStatus?.exitCode ?? "unknown"}</code>.
        Check the logs below for the cause — common issues include a missing CKB
        key, wrong config path, or CKB RPC unreachable.
      </p>
      <ol className="node-recovery-steps">
        <li>Read the latest log lines for an error message.</li>
        <li>
          Confirm your CKB key file and keychain password under Setup and Node.
        </li>
        <li>Fix the issue, then click Start again.</li>
      </ol>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => void onSyncRuntime()}
      >
        Refresh status
      </button>
    </div>
  );
}
