import { useMemo } from "react";
import { logTextIndicatesFiberStoreLock } from "../lib/nodePresence";
import type { NodePresenceKind } from "../lib/nodePresence";
import type { CkbKeyStatus, FnnStatusView } from "../types/settings";
import { StartStopNodeButton } from "./StartStopNodeButton";

type NodeTabProps = {
  settingsDataDir: string | undefined;
  ckbKeyStatus: CkbKeyStatus | null;
  nodeTabPrivKey: string;
  onNodeTabPrivKeyChange: (value: string) => void;
  onSaveNodeTabPrivKey: () => void | Promise<void>;
  onOpenCkbKeyFolder: () => void | Promise<void>;
  fnnStatus: FnnStatusView | null;
  nodePresence: NodePresenceKind;
  fnnLogs: string[];
  onStartNode: () => void | Promise<void>;
  onStopNode: () => void | Promise<void>;
  onSyncRuntime: () => void | Promise<void>;
};

export function NodeTab({
  settingsDataDir,
  ckbKeyStatus,
  nodeTabPrivKey,
  onNodeTabPrivKeyChange,
  onSaveNodeTabPrivKey,
  onOpenCkbKeyFolder,
  fnnStatus,
  nodePresence,
  fnnLogs,
  onStartNode,
  onStopNode,
  onSyncRuntime,
}: NodeTabProps) {
  const keyPathDisplay = useMemo(() => {
    if (!settingsDataDir?.trim()) return "{data folder}/ckb/key";
    const base = settingsDataDir.replace(/[/\\]+$/, "");
    return `${base}/ckb/key`;
  }, [settingsDataDir]);

  const logPanelLines = useMemo(() => {
    if (nodePresence === "remote" && fnnStatus?.kind !== "running") {
      return [
        "[fiber-desktop] A node answers at your configured Node API URL.",
        "[fiber-desktop] Lines below are only from fnn started with Start in this app (not another terminal or window).",
        "[fiber-desktop] Open the Network tab to use RPC, or stop the other process and Start here for live logs.",
        "—",
        ...fnnLogs,
      ];
    }
    return fnnLogs;
  }, [nodePresence, fnnStatus?.kind, fnnLogs]);

  return (
    <div className="panel-stack">
      <section className="panel">
        <h2 className="panel-title">Run your node</h2>
        <p className="panel-lead panel-lead-tight">
          Start and monitor the local <strong>fnn</strong> process using paths
          from Setup.
        </p>
        <div className="key-file-row">
          <span className="key-file-row-label">CKB identity key</span>
          <div className="key-file-row-inner">
            <code
              className="code-pill key-file-path"
              title="One line of hex in this file acts as the node wallet key."
            >
              {keyPathDisplay}
            </code>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void onOpenCkbKeyFolder()}
            >
              Open folder
            </button>
            {ckbKeyStatus?.ready ? (
              <span className="key-ready-badge">Key detected</span>
            ) : null}
          </div>
        </div>
        <div className="field node-key-paste-field">
          <span className="field-label">
            {ckbKeyStatus?.ready
              ? "Replace key (optional)"
              : "Paste private key (hex)"}
          </span>
          <div className="inline-field">
            <input
              type="password"
              className="input input-mono"
              value={nodeTabPrivKey}
              onChange={(e) => onNodeTabPrivKeyChange(e.target.value)}
              placeholder="64 hex characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!nodeTabPrivKey.trim()}
              onClick={() => void onSaveNodeTabPrivKey()}
            >
              Save to disk
            </button>
          </div>
          <p className="field-hint">
            Writes to the path above. Optional{" "}
            <code className="code-pill">0x</code> prefix is accepted.
          </p>
        </div>
        <p className="field-hint key-file-docs-hint">
          Exporting a key and testnet walkthrough:{" "}
          <a
            className="inline-link"
            href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md"
            target="_blank"
            rel="noreferrer"
          >
            Fiber testnet nodes
          </a>
          .
        </p>
        {logTextIndicatesFiberStoreLock(fnnLogs) ? (
          <div className="node-lock-hint" role="note">
            <strong className="node-lock-hint-title">
              Data folder is already in use
            </strong>
            <p className="node-lock-hint-body">
              Another <code className="code-pill">fnn</code> or Fiber Desktop
              window is using the same data directory, so the database cannot
              lock. Quit duplicates and any terminal{" "}
              <code className="code-pill">fnn</code> with the same{" "}
              <code className="code-pill">-d</code> path before starting again.
            </p>
          </div>
        ) : null}
        <div className="btn-row">
          <StartStopNodeButton
            locallyRunning={fnnStatus?.kind === "running"}
            disableStartBecauseRemote={nodePresence === "remote"}
            onStart={onStartNode}
            onStop={onStopNode}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void onSyncRuntime()}
          >
            Refresh
          </button>
        </div>
      </section>
      <section className="panel panel-grow">
        <div className="panel-head">
          <h2 className="panel-title">Logs</h2>
          <span className="panel-meta">
            {fnnLogs.length === 0
              ? "No output yet"
              : `${fnnLogs.length} recent lines`}
          </span>
        </div>
        <textarea
          className="log-view"
          readOnly
          value={logPanelLines.join("\n")}
          spellCheck={false}
          aria-label="Node log output"
          placeholder="Start the node to see live messages here…"
        />
      </section>
    </div>
  );
}
