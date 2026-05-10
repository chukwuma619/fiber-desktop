import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { GuidedSetupModal } from "./components/GuidedSetupModal";
import {
  GUIDED_SETUP_COMPLETE,
  GUIDED_SETUP_DISMISSED,
} from "./constants/storageKeys";
import { PUBLIC_NODE_PUBKEYS, type NetworkId } from "./lib/publicNodes";
import type {
  AppSettings,
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

function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [password, setPassword] = useState("");
  const [hasPw, setHasPw] = useState<boolean | null>(null);
  const [fnnStatus, setFnnStatus] = useState<FnnStatusView | null>(null);
  const [fnnLogs, setFnnLogs] = useState<string[]>([]);
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcOut, setRpcOut] = useState<string>("");
  const [channelFunding, setChannelFunding] = useState("0xb9e459300");
  const [invoiceAmount, setInvoiceAmount] = useState("0x5f5e100");
  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [pinnedInfo, setPinnedInfo] = useState<PinnedFnnInfo | null>(null);
  const [toolsBusy, setToolsBusy] = useState<string | null>(null);
  const [fnnBinaryStatus, setFnnBinaryStatus] =
    useState<FnnBinaryStatus | null>(null);

  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStep, setGuidedStep] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [guidedWizardPassword, setGuidedWizardPassword] = useState("");
  const [guidedConfigInstalled, setGuidedConfigInstalled] = useState(false);
  const [guidedPasswordSavedOk, setGuidedPasswordSavedOk] = useState(false);
  const [guidanceComplete, setGuidanceComplete] = useState(readGuidanceComplete);
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

  const pollFnn = useCallback(async () => {
    try {
      setFnnStatus(await invoke<FnnStatusView>("fnn_status"));
      setFnnLogs(await invoke<string[]>("fnn_logs", { maxLines: 200 }));
    } catch {
      setFnnStatus(null);
    }
  }, []);

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

  useEffect(() => {
    void refreshSettings();
    void refreshSecurity();
    void refreshPinned();
    void refreshFnnBinaryStatus();
  }, [
    refreshSettings,
    refreshSecurity,
    refreshPinned,
    refreshFnnBinaryStatus,
  ]);

  useEffect(() => {
    const t = window.setInterval(() => void pollFnn(), 2000);
    void pollFnn();
    return () => window.clearInterval(t);
  }, [pollFnn]);

  useEffect(() => {
    if (guidedAutoOpened.current) return;
    if (!settings || hasPw === null) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(GUIDED_SETUP_COMPLETE) === "1") return;
    if (localStorage.getItem(GUIDED_SETUP_DISMISSED) === "1") return;
    if (hasPw) return;
    guidedAutoOpened.current = true;
    setGuidedStep(0);
    setGuidedWizardPassword("");
    setGuidedConfigInstalled(false);
    setGuidedPasswordSavedOk(false);
    setGuidedOpen(true);
  }, [settings, hasPw]);

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
      await pollFnn();
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
      await pollFnn();
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

  async function runRpc(
    label: string,
    method: string,
    params: unknown,
  ) {
    setRpcBusy(label);
    setRpcOut("");
    try {
      const result = await rpc(method, params);
      setRpcOut(JSON.stringify(result, null, 2));
    } catch (e) {
      setRpcOut(String(e));
    } finally {
      setRpcBusy(null);
    }
  }

  const nodeKeys = PUBLIC_NODE_PUBKEYS[netId];

  const programReady = Boolean(
    fnnBinaryStatus &&
      (fnnBinaryStatus.bundledAvailable || !fnnBinaryStatus.isBundled),
  );

  const canContinuePasswordStep =
    hasPw === true || guidedPasswordSavedOk;

  const statusLabel =
    fnnStatus?.kind === "running"
      ? "Running"
      : fnnStatus?.kind === "crashed"
        ? "Crashed"
        : "Stopped";

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
          {fnnStatus && (
            <div
              className={`status-chip status-chip-${fnnStatus.kind}`}
              title={
                fnnStatus.kind === "crashed" && fnnStatus.exitCode != null
                  ? `Exit code ${fnnStatus.exitCode}`
                  : undefined
              }
            >
              <span className="status-dot" aria-hidden />
              <span className="status-text">{statusLabel}</span>
              {fnnStatus.pid != null && (
                <span className="status-meta">PID {fnnStatus.pid}</span>
              )}
            </div>
          )}
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
                  <h2 className="panel-title">New here?</h2>
                  <p className="panel-lead">
                    Use <strong>Guided setup</strong> to pick your network, create
                    your config file, save your password, and start your node—no
                    guessing which field comes first.
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
                <div
                  className={`hero-status hero-status-${fnnStatus?.kind ?? "stopped"}`}
                >
                  <div className="hero-status-text">
                    <span className="hero-label">Your node</span>
                    <strong className="hero-value">{statusLabel}</strong>
                    <span className="hero-sub">
                      {fnnStatus?.kind === "running"
                        ? "It should answer at the address you set under Setup → Network."
                        : fnnStatus?.kind === "crashed"
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
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void startFnn()}
                    >
                      Start node
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => void stopFnn()}
                    >
                      Stop
                    </button>
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
                  Uses the folders and config you set in Setup. You must also have a
                  CKB private key file at{" "}
                  <code className="code-pill">{"{data folder}/ckb/key"}</code> (see{" "}
                  <a
                    className="inline-link"
                    href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fiber testnet nodes
                  </a>
                  ). Recent output appears below.
                </p>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void startFnn()}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-ghost"
                    onClick={() => void stopFnn()}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void pollFnn()}
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
                  value={fnnLogs.join("\n")}
                  spellCheck={false}
                  aria-label="Node log output"
                  placeholder="Start the node to see live messages here…"
                />
              </section>
            </div>
          )}

          {tab === "network" && (
            <div className="panel-stack network-layout">
              <section className="panel">
                <h2 className="panel-title">Talk to your node</h2>
                <p className="panel-lead">
                  These buttons send requests to your node at the{" "}
                  <strong>Node API</strong> address from Setup. Results appear on
                  the right. Public relay keys match the{" "}
                  <a
                    className="inline-link"
                    href="https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md"
                    target="_blank"
                    rel="noreferrer"
                  >
                    public nodes
                  </a>{" "}
                  list for Fiber v0.8+.
                </p>

                <h3 className="subhead">Look up status</h3>
                <div className="chip-actions">
                  <button
                    type="button"
                    className="btn btn-chip"
                    disabled={!!rpcBusy}
                    onClick={() => void runRpc("info", "node_info", [])}
                  >
                    {rpcBusy === "info" ? "…" : "Node info"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-chip"
                    disabled={!!rpcBusy}
                    onClick={() =>
                      void runRpc("channels", "list_channels", [{}])
                    }
                  >
                    {rpcBusy === "channels" ? "…" : "My channels"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-chip"
                    disabled={!!rpcBusy}
                    onClick={() =>
                      void runRpc("graph", "graph_nodes", { limit: 50 })
                    }
                  >
                    {rpcBusy === "graph" ? "…" : "Network map"}
                  </button>
                </div>

                <h3 className="subhead">Public relays ({netId})</h3>
                <div className="chip-actions">
                  <button
                    type="button"
                    className="btn btn-chip"
                    disabled={!!rpcBusy}
                    title={nodeKeys.node1}
                    onClick={() =>
                      void runRpc("connect1", "connect_peer", [
                        { pubkey: nodeKeys.node1 },
                      ])
                    }
                  >
                    {rpcBusy === "connect1" ? "…" : "Connect relay 1"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-chip"
                    disabled={!!rpcBusy}
                    title={nodeKeys.node2}
                    onClick={() =>
                      void runRpc("connect2", "connect_peer", [
                        { pubkey: nodeKeys.node2 },
                      ])
                    }
                  >
                    {rpcBusy === "connect2" ? "…" : "Connect relay 2"}
                  </button>
                </div>

                <h3 className="subhead">Channels & payments</h3>
                <div className="rpc-form-blocks">
                  <div className="rpc-form-block">
                    <label className="field">
                      <span className="field-label">
                        Open channel — amount (advanced: hex)
                      </span>
                      <div className="inline-field">
                        <input
                          className="input input-mono"
                          value={channelFunding}
                          onChange={(e) => setChannelFunding(e.target.value)}
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={!!rpcBusy}
                          onClick={() => {
                            const amt = channelFunding.trim();
                            void runRpc("open", "open_channel", [
                              {
                                pubkey: nodeKeys.node1,
                                funding_amount: amt,
                                public: true,
                              },
                            ]);
                          }}
                        >
                          Open channel
                        </button>
                      </div>
                    </label>
                    <p className="field-hint">
                      Example <code>0xb9e459300</code> ≈ 499 CKB (see public
                      nodes doc).
                    </p>
                  </div>
                  <div className="rpc-form-block">
                    <label className="field">
                      <span className="field-label">New invoice — amount (hex)</span>
                      <div className="inline-field">
                        <input
                          className="input input-mono"
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={!!rpcBusy}
                          onClick={() =>
                            void runRpc("invoice", "new_invoice", [
                              {
                                amount: invoiceAmount.trim(),
                                currency: netId === "mainnet" ? "Fibb" : "Fibt",
                                description: "fiber-desktop",
                              },
                            ])
                          }
                        >
                          Create invoice
                        </button>
                      </div>
                    </label>
                  </div>
                  <div className="rpc-form-block">
                    <label className="field">
                      <span className="field-label">Send payment — invoice</span>
                      <div className="inline-field">
                        <input
                          className="input input-mono"
                          value={paymentInvoice}
                          onChange={(e) => setPaymentInvoice(e.target.value)}
                          placeholder="Paste invoice string"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={!!rpcBusy || !paymentInvoice.trim()}
                          onClick={() =>
                            void runRpc("pay", "send_payment", [
                              { invoice: paymentInvoice.trim() },
                            ])
                          }
                        >
                          Send payment
                        </button>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              <section className="panel panel-sticky-response">
                <div className="panel-head">
                  <h2 className="panel-title">Result</h2>
                  <span className="panel-meta">
                    {rpcBusy ? "Working…" : "Ready"}
                  </span>
                </div>
                <textarea
                  className="response-view"
                  readOnly
                  value={rpcOut}
                  spellCheck={false}
                  placeholder="The last reply from your node will show here."
                  aria-label="Last result from your node"
                />
              </section>
            </div>
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
        />
      )}
    </div>
  );
}

export default App;
