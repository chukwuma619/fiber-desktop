import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuidedSetupModal } from "./components/GuidedSetupModal";
import { NetworkTab } from "./components/NetworkTab";
import {
  GUIDED_SETUP_COMPLETE,
  GUIDED_SETUP_DISMISSED,
} from "./constants/storageKeys";
import { PUBLIC_NODE_PUBKEYS, type NetworkId } from "./lib/publicNodes";
import type {
  AppSettings,
  CkbKeyStatus,
  FnnBinaryStatus,
  FnnStatusView,
  Network,
  PinnedFnnInfo,
} from "./types/settings";
import "./App.css";

async function rpc(method: string, params: unknown) {
  return invoke<unknown>("fiber_rpc_call", { method, params });
}

const TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    hint: "See status and get started",
  },
  {
    id: "setup" as const,
    label: "Setup",
    hint: "Network, folders, and security",
  },
  { id: "node" as const, label: "Node", hint: "Start, stop, and logs" },
  {
    id: "network" as const,
    label: "Network",
    hint: "Connect and try payments",
  },
];

type TabId = (typeof TABS)[number]["id"];

function readGuidanceComplete(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(GUIDED_SETUP_COMPLETE) === "1";
}

/** fnn exits when RocksDB cannot lock the store (second process / stray fnn). */
function logTextIndicatesFiberStoreLock(logs: string[]): boolean {
  const t = logs.join("\n");
  if (!t.includes("LOCK") || !t.includes("fiber")) {
    return false;
  }
  return (
    t.includes("temporarily unavailable") ||
    t.includes("Would block") ||
    t.includes("already held") ||
    t.includes("Os { code: 35") ||
    t.includes("os error 35")
  );
}

/** Unified UI: local child wins; else RPC `node_info` means something already serves this URL. */
type NodePresenceKind = "stopped" | "running" | "crashed" | "remote";

function deriveNodePresence(
  fnn: FnnStatusView | null,
  rpcReachable: boolean,
): NodePresenceKind {
  if (fnn?.kind === "running") {
    return "running";
  }
  if (fnn?.kind === "crashed") {
    return "crashed";
  }
  if (rpcReachable) {
    return "remote";
  }
  return "stopped";
}

type StartStopNodeButtonProps = {
  locallyRunning: boolean;
  disableStartBecauseRemote: boolean;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
};

function StartStopNodeButton({
  locallyRunning,
  disableStartBecauseRemote,
  onStart,
  onStop,
}: StartStopNodeButtonProps) {
  if (locallyRunning) {
    return (
      <button
        type="button"
        className="btn btn-danger-ghost"
        onClick={() => void onStop()}
      >
        Stop node
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disableStartBecauseRemote}
      title={
        disableStartBecauseRemote
          ? "Another fnn is already using this data folder or RPC is live elsewhere. Stop that process first, then start here."
          : undefined
      }
      onClick={() => void onStart()}
    >
      Start node
    </button>
  );
}

function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [password, setPassword] = useState("");
  const [hasPw, setHasPw] = useState<boolean | null>(null);
  const [fnnStatus, setFnnStatus] = useState<FnnStatusView | null>(null);
  const [fnnLogs, setFnnLogs] = useState<string[]>([]);
  const [rpcReachable, setRpcReachable] = useState(false);
  const [pinnedInfo, setPinnedInfo] = useState<PinnedFnnInfo | null>(null);
  const [toolsBusy, setToolsBusy] = useState<string | null>(null);
  const [fnnBinaryStatus, setFnnBinaryStatus] =
    useState<FnnBinaryStatus | null>(null);

  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStep, setGuidedStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [guidedWizardPassword, setGuidedWizardPassword] = useState("");
  const [guidedConfigInstalled, setGuidedConfigInstalled] = useState(false);
  const [guidedPasswordSavedOk, setGuidedPasswordSavedOk] = useState(false);
  const [guidanceComplete, setGuidanceComplete] = useState(() =>
    readGuidanceComplete(),
  );
  const [ckbKeyStatus, setCkbKeyStatus] = useState<CkbKeyStatus | null>(null);
  const guidedAutoOpened = useRef(false);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await invoke<AppSettings>("get_settings");
      setSettings(s);
      setLoadError(null);
    } catch (e) {
      setLoadError(String(e));
    }
  }, []);

  const refreshSecurity = useCallback(async () => {
    try {
      const raw = await invoke<boolean | string | number>(
        "has_fnn_secret_password",
      );
      const present =
        raw === true ||
        raw === 1 ||
        raw === "true" ||
        raw === "1";
      setHasPw(present);
    } catch {
      setHasPw(false);
    }
  }, []);

  const refreshNodeRuntime = useCallback(async () => {
    try {
      setFnnStatus(await invoke<FnnStatusView>("fnn_status"));
      setFnnLogs(await invoke<string[]>("fnn_logs", { maxLines: 200 }));
    } catch {
      setFnnStatus(null);
    }
    const url = settings?.fnnRpcUrl?.trim();
    if (!url) {
      setRpcReachable(false);
      return;
    }
    try {
      await rpc("node_info", []);
      setRpcReachable(true);
    } catch {
      setRpcReachable(false);
    }
  }, [settings?.fnnRpcUrl]);

  const refreshPinned = useCallback(async () => {
    try {
      setPinnedInfo(await invoke<PinnedFnnInfo>("pinned_fnn_info"));
    } catch {
      setPinnedInfo(null);
    }
  }, []);

  const refreshFnnBinaryStatus = useCallback(async () => {
    try {
      setFnnBinaryStatus(await invoke<FnnBinaryStatus>("fnn_binary_status"));
    } catch {
      setFnnBinaryStatus(null);
    }
  }, []);

  const refreshCkbKeyStatus = useCallback(async () => {
    try {
      setCkbKeyStatus(await invoke<CkbKeyStatus>("ckb_key_status"));
    } catch {
      setCkbKeyStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
    void refreshSecurity();
    void refreshPinned();
    void refreshFnnBinaryStatus();
    void refreshCkbKeyStatus();
  }, [
    refreshSettings,
    refreshSecurity,
    refreshPinned,
    refreshFnnBinaryStatus,
    refreshCkbKeyStatus,
  ]);

  useEffect(() => {
    const t = window.setInterval(() => void refreshCkbKeyStatus(), 4000);
    return () => window.clearInterval(t);
  }, [refreshCkbKeyStatus]);

  useEffect(() => {
    const t = window.setInterval(() => void refreshNodeRuntime(), 1500);
    void refreshNodeRuntime();
    return () => window.clearInterval(t);
  }, [refreshNodeRuntime]);

  useEffect(() => {
    if (guidedAutoOpened.current) return;
    if (!settings || hasPw === null) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(GUIDED_SETUP_COMPLETE) === "1") return;
    if (localStorage.getItem(GUIDED_SETUP_DISMISSED) === "1") return;
    guidedAutoOpened.current = true;
    setGuidedStep(0);
    setGuidedWizardPassword("");
    setGuidedConfigInstalled(false);
    setGuidedPasswordSavedOk(false);
    setGuidedOpen(true);
  }, [settings]);

  useEffect(() => {
    if (!guidedOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuidedOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [guidedOpen]);

  function openGuidedReset() {
    setGuidedStep(0);
    setGuidedWizardPassword("");
    setGuidedConfigInstalled(false);
    setGuidedPasswordSavedOk(false);
    setGuidedOpen(true);
  }

  function dismissGuidedForLater() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(GUIDED_SETUP_DISMISSED, "1");
    }
    setGuidedOpen(false);
  }

  function markGuidanceComplete() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(GUIDED_SETUP_COMPLETE, "1");
    }
    setGuidanceComplete(true);
  }

  async function saveSettings() {
    if (!settings) return;
    setSavedOk(false);
    try {
      await invoke("save_settings", { settings });
      setSavedOk(true);
      void refreshFnnBinaryStatus();
      setTimeout(() => setSavedOk(false), 2200);
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function savePassword(override?: string) {
    const raw = (override ?? password).trim();
    if (!raw) return;
    try {
      await invoke("set_fnn_secret_password", { password: raw });
      setPassword("");
      setGuidedWizardPassword("");
      setHasPw(true);
      if (guidedOpen) {
        setGuidedPasswordSavedOk(true);
      }
      await refreshSecurity();
    } catch (e) {
      setLoadError(String(e));
      setGuidedPasswordSavedOk(false);
      void refreshSecurity();
    }
  }

  async function startFnn(opts?: { guidedFinish?: boolean }) {
    setLoadError(null);
    try {
      await invoke("fnn_start");
      await refreshNodeRuntime();
      setTab("node");
      if (opts?.guidedFinish) {
        markGuidanceComplete();
        setGuidedOpen(false);
      }
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function stopFnn() {
    try {
      await invoke("fnn_stop");
      await refreshNodeRuntime();
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function downloadPinnedFnn() {
    setToolsBusy("dl");
    setLoadError(null);
    try {
      await invoke<string>("download_pinned_fnn");
      await refreshSettings();
      await refreshFnnBinaryStatus();
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }

  async function installUpstreamConfig() {
    setToolsBusy("cfg");
    setLoadError(null);
    try {
      await invoke("install_upstream_fnn_config");
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }

  async function applyCkbRpcToConfigFile() {
    setToolsBusy("rpc");
    setLoadError(null);
    try {
      await invoke("apply_ckb_rpc_to_config_file");
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }

  async function useBundledFnn() {
    setToolsBusy("useBundled");
    setLoadError(null);
    try {
      await invoke<string>("use_bundled_fnn_binary");
      await refreshSettings();
      await refreshFnnBinaryStatus();
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }

  async function openCkbKeyFolder() {
    setLoadError(null);
    try {
      const dir = await invoke<string>("prepare_ckb_key_folder");
      await openPath(dir);
      void refreshCkbKeyStatus();
    } catch (e) {
      setLoadError(String(e));
    }
  }

  function applyNetworkDefaults(net: NetworkId) {
    if (!settings) return;
    const next = { ...settings, network: net };
    if (net === "mainnet") {
      next.ckbRpcUrl = "https://mainnet.ckbapp.dev/";
    } else {
      next.ckbRpcUrl = "https://testnet.ckbapp.dev/";
    }
    setSettings(next);
  }

  const netId: NetworkId =
    settings?.network === "mainnet" ? "mainnet" : "testnet";

  const nodeKeys = PUBLIC_NODE_PUBKEYS[netId];

  const programReady = Boolean(fnnBinaryStatus?.executableReady);

  const canContinuePasswordStep =
    hasPw === true || guidedPasswordSavedOk;

  const nodePresence = deriveNodePresence(fnnStatus, rpcReachable);

  const statusLabel =
    nodePresence === "running"
      ? "Running"
      : nodePresence === "remote"
        ? "Reachable"
        : nodePresence === "crashed"
          ? "Crashed"
          : "Stopped";

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
    <div className="shell">
      <aside className="nav-rail" aria-label="Main navigation">
        <div className="nav-brand">
          <span className="nav-brand-mark" aria-hidden />
          <div>
            <div className="nav-brand-title">Fiber Network</div>
            <div className="nav-brand-sub">Desktop · run your node locally</div>
          </div>
        </div>
        <nav className="nav-list">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`nav-item${tab === t.id ? " nav-item-active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className="nav-item-label">{t.label}</span>
              <span className="nav-item-hint">{t.hint}</span>
            </button>
          ))}
        </nav>
        <a
          className="nav-doc-link"
          href="https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md"
          target="_blank"
          rel="noreferrer"
        >
          About public test nodes →
        </a>
      </aside>

      <div className="shell-main">
        <header className="top-bar">
          <div className="top-bar-left">
            <div className="top-bar-title">
              <h1>{TABS.find((x) => x.id === tab)?.label}</h1>
              <p className="top-bar-desc">
                {TABS.find((x) => x.id === tab)?.hint}
              </p>
            </div>
            <nav
              className="top-bar-links"
              aria-label="Fiber Network on the web"
            >
              <a
                className="top-bar-link"
                href="https://docs.fiber.world/"
                target="_blank"
                rel="noreferrer"
              >
                Documentation
              </a>
              <span className="top-bar-link-sep" aria-hidden>
                ·
              </span>
              <a
                className="top-bar-link"
                href="https://www.fiber.world/"
                target="_blank"
                rel="noreferrer"
              >
                fiber.world
              </a>
            </nav>
          </div>
          <div
            className={`status-chip status-chip-${nodePresence}`}
            title={
              nodePresence === "crashed" && fnnStatus?.exitCode != null
                ? `Exit code ${fnnStatus.exitCode}`
                : nodePresence === "remote"
                  ? "node_info succeeded at your Node API URL (this app may not own the process)"
                  : undefined
            }
          >
            <span className="status-dot" aria-hidden />
            <span className="status-text">{statusLabel}</span>
            {nodePresence === "running" && fnnStatus?.pid != null && (
              <span className="status-meta">PID {fnnStatus.pid}</span>
            )}
          </div>
        </header>

        {loadError && !guidedOpen && (
          <div className="banner banner-error" role="alert">
            <span className="banner-body">{loadError}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm banner-dismiss"
              onClick={() => setLoadError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="main-scroll">
          {tab === "overview" && (
            <div className="panel-stack">
              {!guidanceComplete && (
                <section className="panel panel-get-started">
                  <h2 className="panel-title">First launch</h2>
                  <p className="panel-lead">
                    This node uses a <strong>CKB private key file</strong> as its
                    on-chain identity—the same role as a wallet for Fiber. Open{" "}
                    <strong>Guided setup</strong> and we will walk you through
                    network, config, placing your key, saving your unlock password,
                    and starting the node in order.
                  </p>
                  <div className="get-started-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openGuidedReset()}
                    >
                      Guided setup
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setTab("setup")}
                    >
                      Open full setup
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => markGuidanceComplete()}
                    >
                      I am already set up
                    </button>
                  </div>
                </section>
              )}

              <section className="panel panel-hero">
                <h2 className="sr-only">Node status</h2>
                <div className={`hero-status hero-status-${nodePresence}`}>
                  <div className="hero-status-text">
                    <span className="hero-label">Your node</span>
                    <strong className="hero-value">{statusLabel}</strong>
                    <span className="hero-sub">
                      {nodePresence === "running"
                        ? "It should answer at the address you set under Setup → Network."
                        : nodePresence === "remote"
                          ? "Something is already serving your Node API URL—try the Network tab. Use Stop node when this app owns the process, or stop the other fnn first if you want to start here."
                          : nodePresence === "crashed"
                            ? "Open the Node tab and read the logs for details."
                            : "Use Guided setup above, then start your node here."}
                    </span>
                  </div>
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openGuidedReset()}
                    >
                      Guided setup
                    </button>
                    <StartStopNodeButton
                      locallyRunning={fnnStatus?.kind === "running"}
                      disableStartBecauseRemote={nodePresence === "remote"}
                      onStart={() => void startFnn()}
                      onStop={() => void stopFnn()}
                    />
                  </div>
                </div>
              </section>

              <section className="panel">
                <h2 className="panel-title">Quick start</h2>
                <p className="panel-lead">
                  Prefer <strong>Guided setup</strong> at the top of this page.
                  If you already know Fiber, you can use the tabs manually:
                </p>
                <ol className="steps-list">
                  <li>
                    <button
                      type="button"
                      className="steps-link"
                      onClick={() => setTab("setup")}
                    >
                      Setup
                    </button>
                    — pick testnet or mainnet, point to your config and data
                    folder, use the included node or download an update, then
                    save your keychain password.
                  </li>
                  <li>
                    <button
                      type="button"
                      className="steps-link"
                      onClick={() => setTab("node")}
                    >
                      Node
                    </button>
                    — start your node and watch live output.
                  </li>
                  <li>
                    <button
                      type="button"
                      className="steps-link"
                      onClick={() => setTab("network")}
                    >
                      Network
                    </button>
                    — connect to public relays and try queries or payments.
                  </li>
                </ol>
              </section>

              <section className="panel panel-muted">
                <h2 className="panel-title">Built-in Fiber node</h2>
                <p className="panel-lead">
                  The app ships with a tested <strong>fnn</strong> (Fiber node)
                  for your computer, version{" "}
                  <strong className="text-accent">
                    {pinnedInfo?.tag ?? fnnBinaryStatus?.pinnedTag ?? "…"}
                  </strong>
                  {pinnedInfo && (
                    <>
                      {" "}
                      <code className="code-pill">{pinnedInfo.assetFileName}</code>
                    </>
                  )}
                  . Most people can leave this as-is. If you need another build,
                  use <strong>Download</strong> or a custom path under Setup.
                </p>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTab("setup")}
                  >
                    Open setup
                  </button>
                </div>
              </section>
            </div>
          )}

          {tab === "setup" && (
            <div className="panel-stack">
              {!settings ? (
                <p className="loading-text">Loading settings…</p>
              ) : (
                <>
                  <section className="panel">
                    <h2 className="panel-title">Easy path</h2>
                    <p className="panel-lead setup-callout-top">
                      Open <strong>Guided setup</strong> from the Overview tab to
                      walk through network, config file, password, and starting
                      the node in order.
                    </p>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openGuidedReset()}
                      >
                        Open guided setup
                      </button>
                    </div>
                  </section>

                  <details className="setup-advanced">
                    <summary>All settings (folders, URLs, downloads)</summary>
                    <div className="setup-advanced-inner">
                  <section className="panel">
                    <h2 className="panel-title">Network & endpoints</h2>
                    <p className="panel-lead">
                      Choose your network and where this app reaches CKB and your
                      local node. These are saved in the app (separate from your
                      keychain password).
                    </p>
                    <div className="field-grid">
                      <label className="field">
                        <span className="field-label">Network</span>
                        <select
                          value={settings.network}
                          onChange={(e) => {
                            const v = e.target.value as Network;
                            applyNetworkDefaults(
                              v === "mainnet" ? "mainnet" : "testnet",
                            );
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
                            setSettings({
                              ...settings,
                              ckbRpcUrl: e.target.value,
                            })
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
                            setSettings({
                              ...settings,
                              fnnRpcUrl: e.target.value,
                            })
                          }
                          placeholder="http://127.0.0.1:8227"
                          spellCheck={false}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="panel">
                    <h2 className="panel-title">Folders & program</h2>
                    <p className="panel-lead">
                      Point to where your node stores data, your{" "}
                      <code className="code-pill">config.yml</code>, and which
                      program runs. Defaults work for many installs.
                    </p>
                    <div className="field-grid">
                      <label className="field field-span-2">
                        <span className="field-label">Data folder</span>
                        <input
                          className="input input-mono"
                          value={settings.fnnDataDir}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              fnnDataDir: e.target.value,
                            })
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
                            setSettings({
                              ...settings,
                              fnnConfigPath: e.target.value,
                            })
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
                            setSettings({
                              ...settings,
                              fnnBinaryPath: e.target.value,
                            })
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
                    <p className="panel-lead">
                      Prefer <strong>Use app-included node</strong> unless you
                      know you need another build. <strong>Download</strong>{" "}
                      saves the same official release into app data and switches
                      to it—handy if the bundled file is missing.
                    </p>

                    {fnnBinaryStatus && (
                      <div
                        className={`callout${fnnBinaryStatus.bundledAvailable ? " callout-ok" : ""}`}
                        role="status"
                      >
                        <div className="callout-title">
                          Official release{" "}
                          <code className="code-pill">
                            {fnnBinaryStatus.pinnedTag}
                          </code>
                        </div>
                        <ul className="callout-list">
                          <li>
                            <strong>Built-in copy:</strong>{" "}
                            {fnnBinaryStatus.bundledAvailable
                              ? "yes"
                              : "not found — use Download below, or reinstall the app"}
                          </li>
                          <li>
                            <strong>Currently using:</strong>{" "}
                            {fnnBinaryStatus.isBundled
                              ? "the app-included build"
                              : "a downloaded or custom program path"}
                          </li>
                          {fnnBinaryStatus.bundledPath && (
                            <li className="callout-mono">
                              {fnnBinaryStatus.bundledPath}
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
                            onClick={() => void useBundledFnn()}
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
                              Fetches the same release into this app&apos;s data
                              folder and switches your settings to use it.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!!toolsBusy}
                            onClick={() => void downloadPinnedFnn()}
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
                              Replaces your config file with the upstream example
                              and fills in the CKB RPC address from Setup.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!!toolsBusy}
                            onClick={() => void installUpstreamConfig()}
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
                              Keeps your existing file; only updates the CKB RPC
                              line to match Setup.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!!toolsBusy}
                            onClick={() => void applyCkbRpcToConfigFile()}
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
                    <p className="panel-lead">
                      Your node needs a password to unlock keys. It is stored only
                      in the system keychain (never in plain settings files).
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
                        onClick={() => void savePassword()}
                        disabled={!password.trim()}
                      >
                        Save to keychain
                      </button>
                      <span
                        className={`keychain-badge${hasPw ? " keychain-ok" : ""}`}
                      >
                        {hasPw === null
                          ? "Checking keychain…"
                          : hasPw
                            ? "Password stored"
                            : "No password yet"}
                      </span>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {tab === "node" && (
            <div className="panel-stack">
              <section className="panel">
                <h2 className="panel-title">Run your node</h2>
                <p className="panel-lead">
                  Uses the folders and config you set in Setup. Put your CKB private
                  key (one line of hex) at{" "}
                  <code className="code-pill">{"{data folder}/ckb/key"}</code>
                  —that file is your <strong>wallet key</strong> for this node.{" "}
                  <button
                    type="button"
                    className="inline-link inline-link-button"
                    onClick={() => void openCkbKeyFolder()}
                  >
                    Open the key folder
                  </button>
                  {ckbKeyStatus?.ready ? (
                    <span className="key-ready-badge"> · Key file detected</span>
                  ) : null}{" "}
                  See{" "}
                  <a
                    className="inline-link"
                    href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fiber testnet nodes
                  </a>{" "}
                  for exporting a key with{" "}
                  <code className="code-pill">ckb-cli</code>. Recent output appears
                  below.
                </p>
                {logTextIndicatesFiberStoreLock(fnnLogs) ? (
                  <div className="node-lock-hint" role="note">
                    <strong className="node-lock-hint-title">
                      Data folder is already in use
                    </strong>
                    <p className="node-lock-hint-body">
                      Another Fiber node (or a second Fiber Desktop) is using the
                      same data directory, so the database lock cannot be acquired.
                      Quit duplicate Fiber Desktop windows, then close any
                      terminal{" "}
                      <code className="code-pill">fnn</code> using the same{" "}
                      <code className="code-pill">-d</code> path. On macOS you can
                      run <code className="code-pill">killall fnn</code> in
                      Terminal only if you are sure no other node you need is
                      running. This app allows only one instance at a time; a
                      second launch focuses the existing window instead of
                      starting another copy.
                    </p>
                  </div>
                ) : null}
                <div className="btn-row">
                  <StartStopNodeButton
                    locallyRunning={fnnStatus?.kind === "running"}
                    disableStartBecauseRemote={nodePresence === "remote"}
                    onStart={() => void startFnn()}
                    onStop={() => void stopFnn()}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void refreshNodeRuntime()}
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
          )}

          {tab === "network" && (
            <NetworkTab
              netId={netId}
              nodeKeys={nodeKeys}
              callFiberRpc={rpc}
            />
          )}
        </main>
      </div>

      {settings && (
        <GuidedSetupModal
          open={guidedOpen}
          step={guidedStep}
          onStepChange={setGuidedStep}
          onClose={() => setGuidedOpen(false)}
          onDismissForLater={dismissGuidedForLater}
          settings={settings}
          setSettings={setSettings}
          applyNetworkDefaults={applyNetworkDefaults}
          saveSettings={saveSettings}
          bundledAvailable={!!fnnBinaryStatus?.bundledAvailable}
          programReady={programReady}
          onDownloadFnn={downloadPinnedFnn}
          toolsBusy={toolsBusy}
          onInstallConfig={installUpstreamConfig}
          wizardPassword={guidedWizardPassword}
          onWizardPasswordChange={setGuidedWizardPassword}
          onSaveWizardPassword={async () => {
            await savePassword(guidedWizardPassword);
          }}
          hasPw={hasPw}
          canContinuePasswordStep={canContinuePasswordStep}
          passwordSavedInGuided={guidedPasswordSavedOk}
          onStartNode={async () => {
            await startFnn({ guidedFinish: true });
          }}
          onMarkComplete={() => {
            markGuidanceComplete();
            setGuidedOpen(false);
          }}
          configInstalled={guidedConfigInstalled}
          onConfigInstalled={() => setGuidedConfigInstalled(true)}
          blockingError={guidedOpen ? loadError : null}
          onDismissBlockingError={() => setLoadError(null)}
          ckbKeyStatus={ckbKeyStatus}
          onRefreshCkbKey={() => void refreshCkbKeyStatus()}
          onOpenKeyFolder={openCkbKeyFolder}
        />
      )}
    </div>
  );
}

export default App;
