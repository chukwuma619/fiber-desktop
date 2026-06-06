import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { ActivityTab } from "./components/ActivityTab";
import { AgentsTab } from "./components/AgentsTab";
import { GuidedSetupModal } from "./components/GuidedSetupModal";
import { NetworkTab } from "./components/NetworkTab";
import { NodeTab } from "./components/NodeTab";
import { OverviewTab } from "./components/OverviewTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { ReceiveTab } from "./components/ReceiveTab";
import { SendTab } from "./components/SendTab";
import { SetupTab } from "./components/SetupTab";
import { APP_TABS, type TabId } from "./constants/appTabs";
import { HELP_GUIDES } from "./constants/helpLinks";
import { useAppSecurity } from "./hooks/useAppSecurity";
import { useAppSettings } from "./hooks/useAppSettings";
import { useBackgroundMode } from "./hooks/useBackgroundMode";
import { useCkbKey } from "./hooks/useCkbKey";
import { useFnnBinary } from "./hooks/useFnnBinary";
import { useGuidedSetup } from "./hooks/useGuidedSetup";
import { callFiberRpc } from "./lib/fiberRpc";
import { deriveNodePresence, nodePresenceStatusLabel } from "./lib/nodePresence";
import { useNodeRuntime } from "./lib/useNodeRuntime";
import type { NetworkId } from "./lib/publicNodes";
import "./App.css";

function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const appMounted = useRef(false);

  const {
    settings,
    setSettings,
    loadError,
    setLoadError,
    savedOk,
    refreshSettings,
    saveSettings,
    applyNetworkDefaults,
  } = useAppSettings();

  const { password, setPassword, hasPw, refreshSecurity, savePassword } =
    useAppSecurity(setLoadError);

  const {
    fnnBinaryStatus,
    pinnedInfo,
    toolsBusy,
    downloadProgress,
    refreshPinned,
    ensureFnnBinary,
    downloadPinnedFnn,
    useBundledFnn,
    installUpstreamConfig,
    applyCkbRpcToConfigFile,
  } = useFnnBinary(refreshSettings, setLoadError);

  const {
    ckbKeyStatus,
    nodeTabPrivKey,
    setNodeTabPrivKey,
    refreshCkbKeyStatus,
    persistCkbPrivateKey,
    openCkbKeyFolder,
  } = useCkbKey(setLoadError);

  const {
    guidedOpen,
    setGuidedOpen,
    guidedStep,
    setGuidedStep,
    guidedWizardPassword,
    setGuidedWizardPassword,
    guidedWizardPrivKey,
    setGuidedWizardPrivKey,
    guidedConfigInstalled,
    setGuidedConfigInstalled,
    guidedPasswordSavedOk,
    setGuidedPasswordSavedOk,
    guidanceComplete,
    openGuidedReset,
    dismissGuidedForLater,
    markGuidanceComplete,
  } = useGuidedSetup(settings != null, hasPw);

  useBackgroundMode();

  useEffect(() => {
    appMounted.current = true;
    return () => {
      appMounted.current = false;
    };
  }, []);

  const { fnnStatus, fnnLogs, rpcReachable, syncNodeRuntime, clearLogs } =
    useNodeRuntime({
      fnnRpcUrl: settings?.fnnRpcUrl,
      appMounted,
    });

  useEffect(() => {
    void (async () => {
      await refreshSettings();
      await refreshSecurity();
      await refreshPinned();
      await ensureFnnBinary();
      await refreshCkbKeyStatus();
    })();
  }, [
    refreshSettings,
    refreshSecurity,
    refreshPinned,
    ensureFnnBinary,
    refreshCkbKeyStatus,
  ]);

  async function startFnn(opts?: { guidedFinish?: boolean }) {
    setLoadError(null);
    try {
      clearLogs();
      await invoke("fnn_start");
      await syncNodeRuntime();
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
      await syncNodeRuntime();
    } catch (e) {
      setLoadError(String(e));
    }
  }

  const netId: NetworkId =
    settings?.network === "mainnet" ? "mainnet" : "testnet";

  const programReady = Boolean(fnnBinaryStatus?.executableReady);
  const canContinuePasswordStep =
    hasPw === true || guidedPasswordSavedOk;
  const nodePresence = deriveNodePresence(fnnStatus, rpcReachable);
  const statusLabel = nodePresenceStatusLabel(nodePresence);

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
          {APP_TABS.map((t) => (
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
          href={HELP_GUIDES.index}
          target="_blank"
          rel="noreferrer"
        >
          User guides →
        </a>
      </aside>

      <div className="shell-main">
        <header className="top-bar">
          <div className="top-bar-left">
            <div className="top-bar-title">
              <h1>{APP_TABS.find((x) => x.id === tab)?.label}</h1>
              <p className="top-bar-desc">
                {APP_TABS.find((x) => x.id === tab)?.hint}
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
            <OverviewTab
              guidanceComplete={guidanceComplete}
              nodePresence={nodePresence}
              fnnStatus={fnnStatus}
              ckbKeyStatus={ckbKeyStatus}
              settings={settings}
              pinnedInfo={pinnedInfo}
              fnnBinaryStatus={fnnBinaryStatus}
              onOpenGuided={openGuidedReset}
              onMarkGuidanceComplete={markGuidanceComplete}
              onGoToTab={setTab}
              onStartNode={() => startFnn()}
              onStopNode={() => stopFnn()}
            />
          )}

          {tab === "setup" && (
            <SetupTab
              settings={settings}
              setSettings={setSettings}
              applyNetworkDefaults={applyNetworkDefaults}
              saveSettings={() => void saveSettings()}
              savedOk={savedOk}
              fnnBinaryStatus={fnnBinaryStatus}
              toolsBusy={toolsBusy}
              rpcReachable={rpcReachable}
              password={password}
              setPassword={setPassword}
              hasPw={hasPw}
              onSavePassword={() => void savePassword(password)}
              onUseBundledFnn={useBundledFnn}
              onDownloadPinnedFnn={downloadPinnedFnn}
              onInstallUpstreamConfig={installUpstreamConfig}
              onApplyCkbRpcToConfigFile={applyCkbRpcToConfigFile}
              onGoToOverview={() => setTab("overview")}
            />
          )}

          {tab === "node" && (
            <NodeTab
              settingsDataDir={settings?.fnnDataDir}
              ckbKeyStatus={ckbKeyStatus}
              nodeTabPrivKey={nodeTabPrivKey}
              onNodeTabPrivKeyChange={setNodeTabPrivKey}
              onSaveNodeTabPrivKey={() =>
                persistCkbPrivateKey(nodeTabPrivKey, () => setNodeTabPrivKey(""))
              }
              onOpenCkbKeyFolder={openCkbKeyFolder}
              fnnStatus={fnnStatus}
              nodePresence={nodePresence}
              fnnLogs={fnnLogs}
              onStartNode={() => startFnn()}
              onStopNode={() => stopFnn()}
              onSyncRuntime={syncNodeRuntime}
            />
          )}

          {tab === "payments" && (
            <PaymentsTab
              callFiberRpc={callFiberRpc}
              rpcReachable={rpcReachable}
              network={netId}
            />
          )}

          {tab === "agents" && (
            <AgentsTab
              rpcReachable={rpcReachable}
              nodePresence={nodePresence}
              onGoToNode={() => setTab("node")}
            />
          )}

          {tab === "receive" && (
            <ReceiveTab
              netId={netId}
              callFiberRpc={callFiberRpc}
              rpcReachable={rpcReachable}
              nodePresence={nodePresence}
              onGoToNode={() => setTab("node")}
            />
          )}

          {tab === "send" && (
            <SendTab
              callFiberRpc={callFiberRpc}
              rpcReachable={rpcReachable}
              nodePresence={nodePresence}
              onGoToNode={() => setTab("node")}
            />
          )}

          {tab === "activity" && <ActivityTab />}

          {tab === "network" && (
            <NetworkTab
              callFiberRpc={callFiberRpc}
              rpcReachable={rpcReachable}
              nodePresence={nodePresence}
              onGoToNode={() => setTab("node")}
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
          saveSettings={async () => {
            await saveSettings();
          }}
          bundledAvailable={!!fnnBinaryStatus?.bundledAvailable}
          programReady={programReady}
          onDownloadFnn={downloadPinnedFnn}
          toolsBusy={toolsBusy}
          downloadProgress={downloadProgress}
          onInstallConfig={installUpstreamConfig}
          wizardPassword={guidedWizardPassword}
          onWizardPasswordChange={setGuidedWizardPassword}
          onSaveWizardPassword={async () => {
            const ok = await savePassword(guidedWizardPassword, () =>
              setGuidedPasswordSavedOk(true),
            );
            if (!ok) setGuidedPasswordSavedOk(false);
          }}
          wizardPrivKey={guidedWizardPrivKey}
          onWizardPrivKeyChange={setGuidedWizardPrivKey}
          onSaveWizardPrivKey={() =>
            persistCkbPrivateKey(guidedWizardPrivKey, () =>
              setGuidedWizardPrivKey(""),
            )
          }
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
