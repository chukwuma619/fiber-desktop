import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuidedSetupModal } from "./components/GuidedSetupModal";
import { NetworkTab } from "./components/NetworkTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { ReceiveTab } from "./components/ReceiveTab";
import { SendTab } from "./components/SendTab";
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
    id: "payments" as const,
    label: "Channels",
    hint: "Open, manage, and close channels",
  },
  {
    id: "receive" as const,
    label: "Receive",
    hint: "Generate an invoice to get paid",
  },
  {
    id: "send" as const,
    label: "Send",
    hint: "Pay an invoice from another node",
  },
  {
    id: "network" as const,
    label: "Network",
    hint: "Node info and channel status",
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
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number;
    total: number | null;
    phase: "downloading" | "extracting";
  } | null>(null);
  const [fnnBinaryStatus, setFnnBinaryStatus] =
    useState<FnnBinaryStatus | null>(null);

  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStep, setGuidedStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [guidedWizardPassword, setGuidedWizardPassword] = useState("");
  const [guidedWizardPrivKey, setGuidedWizardPrivKey] = useState("");
  const [nodeTabPrivKey, setNodeTabPrivKey] = useState("");
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
    setGuidedWizardPrivKey("");
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
    setGuidedWizardPrivKey("");
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

  async function persistCkbPrivateKey(
    keyInput: string,
    onSuccessClear: () => void,
  ) {
    const t = keyInput.trim();
    if (!t) return;
    setLoadError(null);
    try {
      await invoke("write_ckb_private_key", { key: t });
      await refreshCkbKeyStatus();
      onSuccessClear();
    } catch (e) {
      setLoadError(String(e));
    }
  }

  async function saveGuidedWizardPrivKey() {
    await persistCkbPrivateKey(guidedWizardPrivKey, () =>
      setGuidedWizardPrivKey(""),
    );
  }

  async function saveNodeTabPrivKey() {
    await persistCkbPrivateKey(nodeTabPrivKey, () => setNodeTabPrivKey(""));
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
    setDownloadProgress(null);
    setLoadError(null);
    const unlisten = await listen<{
      downloaded: number;
      total: number | null;
      phase: "downloading" | "extracting";
    }>("fnn-download-progress", (event) => {
      setDownloadProgress(event.payload);
    });
    try {
      await invoke<string>("download_pinned_fnn");
      await refreshSettings();
      await refreshFnnBinaryStatus();
    } catch (e) {
      setLoadError(String(e));
    } finally {
      unlisten();
      setDownloadProgress(null);
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

  const heroSubOneLine =
    nodePresence === "running"
      ? "Answering at the Node API URL from Setup."
      : nodePresence === "remote"
        ? "Another process may be using this URL—open Network to use RPC."
        : nodePresence === "crashed"
          ? "See the Node tab for details in the log."
          : "Finish setup, then start your node here.";

  const heroSubFullTitle =
    nodePresence === "running"
      ? "It should answer at the address you set under Setup → Network."
      : nodePresence === "remote"
        ? "Something is already serving your Node API URL—try the Network tab. Use Stop node when this app owns the process, or stop the other fnn first if you want to start here."
        : nodePresence === "crashed"
          ? "Open the Node tab and read the logs for details."
          : "Use Guided setup on Overview if you are new, then start your node here.";

  const bundledVersionLabel =
    pinnedInfo?.tag ?? fnnBinaryStatus?.pinnedTag ?? "—";

  const usingBundledLabel =
    fnnBinaryStatus == null
      ? "…"
      : fnnBinaryStatus.isBundled
        ? "App-included build"
        : "Custom / downloaded";

  const keyPathDisplay = useMemo(() => {
    if (!settings?.fnnDataDir?.trim()) return "{data folder}/ckb/key";
    const base = settings.fnnDataDir.replace(/[/\\]+$/, "");
    return `${base}/ckb/key`;
  }, [settings?.fnnDataDir]);

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
                  <p className="panel-lead panel-lead-tight">
                    Your node needs a CKB key file and a saved password—use{" "}
                    <strong>Guided setup</strong> to walk through it in order.
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
                <div className="overview-hero-inner">
                  <div
                    className="stat-pill-row"
                    role="group"
                    aria-label="At a glance"
                  >
                    <div className="stat-pill">
                      <span className="stat-pill-label">Node</span>
                      <span className="stat-pill-value">{statusLabel}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-pill-label">Key file</span>
                      <span className="stat-pill-value">
                        {ckbKeyStatus == null
                          ? "…"
                          : ckbKeyStatus.ready
                            ? "Ready"
                            : "Missing"}
                      </span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-pill-label">Network</span>
                      <span className="stat-pill-value">
                        {!settings
                          ? "…"
                          : settings.network === "mainnet"
                            ? "Mainnet"
                            : "Testnet"}
                      </span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-pill-label">fnn</span>
                      <span
                        className="stat-pill-value stat-pill-value-mono"
                        title={
                          pinnedInfo?.assetFileName
                            ? pinnedInfo.assetFileName
                            : undefined
                        }
                      >
                        {bundledVersionLabel}
                      </span>
                    </div>
                  </div>

                  <div className={`hero-status hero-status-${nodePresence}`}>
                    <div className="hero-status-text">
                      <span className="hero-label">Your node</span>
                      <strong className="hero-value">{statusLabel}</strong>
                      <span className="hero-sub" title={heroSubFullTitle}>
                        {heroSubOneLine}
                      </span>
                    </div>
                    <div className="hero-actions">
                      <StartStopNodeButton
                        locallyRunning={fnnStatus?.kind === "running"}
                        disableStartBecauseRemote={nodePresence === "remote"}
                        onStart={() => void startFnn()}
                        onStop={() => void stopFnn()}
                      />
                    </div>
                  </div>

                  <div className="overview-hero-footer">
                    <div className="overview-info-row">
                      <span className="overview-info-k">Bundled fnn</span>
                      <span className="overview-info-v text-accent">
                        {bundledVersionLabel}
                      </span>
                    </div>
                    <div className="overview-info-row">
                      <span className="overview-info-k">In use</span>
                      <span className="overview-info-v">{usingBundledLabel}</span>
                    </div>
                    <div className="overview-hero-footer-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setTab("setup")}
                      >
                        Node settings
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openGuidedReset()}
                      >
                        Setup wizard
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <h2 className="panel-title">Next steps</h2>
                <div className="next-step-cards" role="list">
                  <button
                    type="button"
                    className="next-step-card"
                    onClick={() => setTab("setup")}
                  >
                    <span className="next-step-card-icon" aria-hidden>
                      ⚙
                    </span>
                    <span className="next-step-card-title">Setup</span>
                    <span className="next-step-card-desc">
                      Network, paths, and security
                    </span>
                  </button>
                  <button
                    type="button"
                    className="next-step-card"
                    onClick={() => setTab("node")}
                  >
                    <span className="next-step-card-icon" aria-hidden>
                      ⬡
                    </span>
                    <span className="next-step-card-title">Node</span>
                    <span className="next-step-card-desc">
                      Start, stop, and logs
                    </span>
                  </button>
                  <button
                    type="button"
                    className="next-step-card"
                    onClick={() => setTab("network")}
                  >
                    <span className="next-step-card-icon" aria-hidden>
                      ⧉
                    </span>
                    <span className="next-step-card-title">Network</span>
                    <span className="next-step-card-desc">
                      Relays, channels, payments
                    </span>
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
                  <div className="tip-bar" role="note">
                    <span className="tip-bar-text">
                      New here? Use <strong>Guided setup</strong> on the{" "}
                      <button
                        type="button"
                        className="inline-link inline-link-button"
                        onClick={() => setTab("overview")}
                      >
                        Overview
                      </button>{" "}
                      tab first.
                    </span>
                  </div>

                  <details className="setup-advanced">
                    <summary>All settings (folders, URLs, downloads)</summary>
                    <div className="setup-advanced-inner">
                  <section className="panel">
                    <h2 className="panel-title">Network & endpoints</h2>
                    <p className="panel-lead panel-lead-tight">
                      Network choice, CKB RPC, and local Node API URL (saved
                      separately from your keychain password).
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
                    <p className="panel-lead panel-lead-tight">
                      Data directory, <code className="code-pill">config.yml</code>
                      , and optional custom fnn binary path.
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
                    <p className="panel-lead panel-lead-tight">
                      Password to unlock node keys—stored in the system keychain
                      only.
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
                <p className="panel-lead panel-lead-tight">
                  Start and monitor the local <strong>fnn</strong> process using
                  paths from Setup.
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
                      onClick={() => void openCkbKeyFolder()}
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
                      onChange={(e) => setNodeTabPrivKey(e.target.value)}
                      placeholder="64 hex characters"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={!nodeTabPrivKey.trim()}
                      onClick={() => void saveNodeTabPrivKey()}
                    >
                      Save to disk
                    </button>
                  </div>
                  <p className="field-hint">
                    Writes to the path above. Optional <code className="code-pill">0x</code>{" "}
                    prefix is accepted.
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
                      Another <code className="code-pill">fnn</code> or Fiber
                      Desktop window is using the same data directory, so the
                      database cannot lock. Quit duplicates and any terminal{" "}
                      <code className="code-pill">fnn</code> with the same{" "}
                      <code className="code-pill">-d</code> path before starting
                      again.
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

          {tab === "payments" && (
            <PaymentsTab
              netId={netId}
              callFiberRpc={rpc}
            />
          )}

          {tab === "receive" && (
            <ReceiveTab
              netId={netId}
              callFiberRpc={rpc}
            />
          )}

          {tab === "send" && (
            <SendTab
              callFiberRpc={rpc}
            />
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
          downloadProgress={downloadProgress}
          onInstallConfig={installUpstreamConfig}
          wizardPassword={guidedWizardPassword}
          onWizardPasswordChange={setGuidedWizardPassword}
          onSaveWizardPassword={async () => {
            await savePassword(guidedWizardPassword);
          }}
          wizardPrivKey={guidedWizardPrivKey}
          onWizardPrivKeyChange={setGuidedWizardPrivKey}
          onSaveWizardPrivKey={saveGuidedWizardPrivKey}
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
