import type { Dispatch, SetStateAction } from "react";
import type { NetworkId } from "../lib/publicNodes";
import { callFiberRpc } from "../lib/fiberRpc";
import type {
  AppSettings,
  FnnBinaryStatus,
  Network,
} from "../types/settings";
import { fnnBinarySourceLabel } from "../types/settings";
import { SetupConnectPeerPanel } from "./SetupConnectPeerPanel";

type SetupTabProps = {
  settings: AppSettings | null;
  setSettings: Dispatch<SetStateAction<AppSettings | null>>;
  applyNetworkDefaults: (net: NetworkId) => void;
  saveSettings: () => void | Promise<void>;
  savedOk: boolean;
  fnnBinaryStatus: FnnBinaryStatus | null;
  toolsBusy: string | null;
  rpcReachable: boolean;
  password: string;
  setPassword: (value: string) => void;
  hasPw: boolean | null;
  onSavePassword: () => void | Promise<void>;
  onUseBundledFnn: () => void | Promise<void>;
  onDownloadPinnedFnn: () => void | Promise<void>;
  onInstallUpstreamConfig: () => void | Promise<void>;
  onApplyCkbRpcToConfigFile: () => void | Promise<void>;
  onGoToOverview: () => void;
};

export function SetupTab({
  settings,
  setSettings,
  applyNetworkDefaults,
  saveSettings,
  savedOk,
  fnnBinaryStatus,
  toolsBusy,
  rpcReachable,
  password,
  setPassword,
  hasPw,
  onSavePassword,
  onUseBundledFnn,
  onDownloadPinnedFnn,
  onInstallUpstreamConfig,
  onApplyCkbRpcToConfigFile,
  onGoToOverview,
}: SetupTabProps) {
  if (!settings) {
    return <p className="loading-text">Loading settings…</p>;
  }

  const activeSourceLabel = fnnBinaryStatus
    ? fnnBinarySourceLabel(fnnBinaryStatus.activeSource)
    : "…";

  return (
    <div className="panel-stack">
      <div className="tip-bar" role="note">
        <span className="tip-bar-text">
          New here? Use <strong>Guided setup</strong> on the{" "}
          <button
            type="button"
            className="inline-link inline-link-button"
            onClick={onGoToOverview}
          >
            Overview
          </button>{" "}
          tab first.
        </span>
      </div>

      <SetupConnectPeerPanel
        rpcReachable={rpcReachable}
        callFiberRpc={callFiberRpc}
      />

      <details className="setup-advanced">
        <summary>All settings (folders, URLs, downloads)</summary>
        <div className="setup-advanced-inner">
          <section className="panel">
            <h2 className="panel-title">Network & endpoints</h2>
            <p className="panel-lead panel-lead-tight">
              Network choice, CKB RPC, and local Node API URL (saved separately
              from your keychain password).
            </p>
            <div className="field-grid">
              <label className="field">
                <span className="field-label">Network</span>
                <select
                  value={settings.network}
                  onChange={(e) => {
                    const v = e.target.value as Network;
                    applyNetworkDefaults(v === "mainnet" ? "mainnet" : "testnet");
                  }}
                  className="input"
                >
                  <option value="testnet">Testnet</option>
                  <option value="mainnet">Mainnet</option>
                </select>
              </label>
              <label className="field field-span-2">
                <span className="field-label">CKB RPC URL</span>
                <input
                  className="input"
                  value={settings.ckbRpcUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, ckbRpcUrl: e.target.value })
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Node API (HTTP)</span>
                <input
                  className="input input-mono"
                  value={settings.fnnRpcUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, fnnRpcUrl: e.target.value })
                  }
                  placeholder="http://127.0.0.1:8227"
                  spellCheck={false}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Folders & program</h2>
            <p className="panel-lead panel-lead-tight">
              Data directory, <code className="code-pill">config.yml</code>, and
              optional custom fnn binary path.
            </p>
            <div className="field-grid">
              <label className="field field-span-2">
                <span className="field-label">Data folder</span>
                <input
                  className="input input-mono"
                  value={settings.fnnDataDir}
                  onChange={(e) =>
                    setSettings({ ...settings, fnnDataDir: e.target.value })
                  }
                  spellCheck={false}
                />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Configuration file</span>
                <input
                  className="input input-mono"
                  value={settings.fnnConfigPath}
                  onChange={(e) =>
                    setSettings({ ...settings, fnnConfigPath: e.target.value })
                  }
                  spellCheck={false}
                />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Node program (optional)</span>
                <input
                  className="input input-mono"
                  value={settings.fnnBinaryPath}
                  onChange={(e) =>
                    setSettings({ ...settings, fnnBinaryPath: e.target.value })
                  }
                  placeholder="Leave blank to use the copy bundled with this app"
                  spellCheck={false}
                />
              </label>
            </div>
            <div className="btn-row btn-row-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void saveSettings()}
              >
                Save settings
              </button>
              {savedOk && (
                <span className="save-toast" role="status">
                  Saved
                </span>
              )}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Included node & updates</h2>

            {fnnBinaryStatus && (
              <div
                className={`callout${fnnBinaryStatus.bundledAvailable ? " callout-ok" : ""}`}
                role="status"
              >
                <div className="callout-title">
                  Official release{" "}
                  <code className="code-pill">{fnnBinaryStatus.pinnedTag}</code>
                </div>
                <ul className="callout-list">
                  <li>
                    <strong>Built-in copy:</strong>{" "}
                    {fnnBinaryStatus.bundledAvailable
                      ? "yes"
                      : "not found — use Download below, or reinstall the app"}
                  </li>
                  <li>
                    <strong>Currently using:</strong> {activeSourceLabel}
                  </li>
                  {fnnBinaryStatus.activePath && (
                    <li className="callout-mono">{fnnBinaryStatus.activePath}</li>
                  )}
                  {fnnBinaryStatus.bundledPath && (
                    <li className="callout-mono">
                      Built-in path: {fnnBinaryStatus.bundledPath}
                    </li>
                  )}
                </ul>
                <div className="btn-row callout-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      !fnnBinaryStatus.bundledAvailable || !!toolsBusy
                    }
                    onClick={() => void onUseBundledFnn()}
                  >
                    {toolsBusy === "useBundled"
                      ? "Switching…"
                      : "Use app-included node"}
                  </button>
                </div>
              </div>
            )}

            <h3 className="subhead subhead-tight">Config & updates</h3>
            <ul className="action-cards">
              <li>
                <div className="action-card">
                  <div className="action-card-body">
                    <h3>Download official node</h3>
                    <p>
                      Fetches the same release into this app&apos;s data folder
                      and switches your settings to use it.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!!toolsBusy}
                    onClick={() => void onDownloadPinnedFnn()}
                  >
                    {toolsBusy === "dl" ? "Downloading…" : "Download"}
                  </button>
                </div>
              </li>
              <li>
                <div className="action-card">
                  <div className="action-card-body">
                    <h3>Reset config from template</h3>
                    <p>
                      Replaces your config file with the upstream example and
                      fills in the CKB RPC address from Setup.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!!toolsBusy}
                    onClick={() => void onInstallUpstreamConfig()}
                  >
                    {toolsBusy === "cfg" ? "Working…" : "Install"}
                  </button>
                </div>
              </li>
              <li>
                <div className="action-card">
                  <div className="action-card-body">
                    <h3>Update CKB address only</h3>
                    <p>
                      Keeps your existing file; only updates the CKB RPC line to
                      match Setup.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!!toolsBusy}
                    onClick={() => void onApplyCkbRpcToConfigFile()}
                  >
                    {toolsBusy === "rpc" ? "Patching…" : "Patch URL"}
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </details>

      <section className="panel">
        <h2 className="panel-title">Security</h2>
        <p className="panel-lead panel-lead-tight">
          Password to unlock node keys—stored in the system keychain only.
        </p>
        <div className="field-grid">
          <label className="field field-span-2">
            <span className="field-label">Node key password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a strong password"
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="btn-row btn-row-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onSavePassword()}
            disabled={!password.trim()}
          >
            Save to keychain
          </button>
          <span className={`keychain-badge${hasPw ? " keychain-ok" : ""}`}>
            {hasPw === null
              ? "Checking keychain…"
              : hasPw
                ? "Password stored"
                : "No password yet"}
          </span>
        </div>
      </section>
    </div>
  );
}
