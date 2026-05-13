import type { Dispatch, SetStateAction } from "react";
import type { AppSettings, CkbKeyStatus } from "../types/settings";
import type { NetworkId } from "../lib/publicNodes";

export type GuidedStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  open: boolean;
  step: GuidedStep;
  onStepChange: (s: GuidedStep) => void;
  onClose: () => void;
  onDismissForLater: () => void;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings | null>>;
  applyNetworkDefaults: (net: NetworkId) => void;
  saveSettings: () => Promise<void>;
  bundledAvailable: boolean;
  /** True when the app can run fnn: sidecar present or a downloaded/custom binary is active. */
  programReady: boolean;
  onDownloadFnn: () => Promise<void>;
  toolsBusy: string | null;
  onInstallConfig: () => Promise<void>;
  wizardPassword: string;
  onWizardPasswordChange: (v: string) => void;
  onSaveWizardPassword: () => Promise<void>;
  wizardPrivKey: string;
  onWizardPrivKeyChange: (v: string) => void;
  onSaveWizardPrivKey: () => Promise<void>;
  hasPw: boolean | null;
  /** Continue on password step: confirmed keychain read, or successful save in this flow. */
  canContinuePasswordStep: boolean;
  /** True after "Save to keychain" succeeded while the wizard is open. */
  passwordSavedInGuided: boolean;
  onStartNode: () => Promise<void>;
  onMarkComplete: () => void;
  configInstalled: boolean;
  onConfigInstalled: () => void;
  /** Shown inside the modal so failures are visible above the dimmed UI. */
  blockingError: string | null;
  onDismissBlockingError: () => void;
  ckbKeyStatus: CkbKeyStatus | null;
  onRefreshCkbKey: () => void;
  onOpenKeyFolder: () => Promise<void>;
};

export function GuidedSetupModal({
  open,
  step,
  onStepChange,
  onClose,
  onDismissForLater,
  settings,
  setSettings,
  applyNetworkDefaults,
  saveSettings,
  bundledAvailable,
  programReady,
  onDownloadFnn,
  toolsBusy,
  onInstallConfig,
  wizardPassword,
  onWizardPasswordChange,
  onSaveWizardPassword,
  wizardPrivKey,
  onWizardPrivKeyChange,
  onSaveWizardPrivKey,
  hasPw,
  canContinuePasswordStep,
  passwordSavedInGuided,
  onStartNode,
  onMarkComplete,
  configInstalled,
  onConfigInstalled,
  blockingError,
  onDismissBlockingError,
  ckbKeyStatus,
  onRefreshCkbKey,
  onOpenKeyFolder,
}: Props) {
  if (!open) return null;

  const busy = !!toolsBusy;

  function goBack() {
    if (step <= 0) return;
    onStepChange((step - 1) as GuidedStep);
  }

  async function goNetworkNext() {
    await saveSettings();
    onStepChange(2);
  }

  async function goProgramNext() {
    if (!programReady) return;
    await saveSettings();
    onStepChange(3);
  }

  async function goFilesNext() {
    await saveSettings();
    onStepChange(4);
  }

  async function handleInstallConfig() {
    await onInstallConfig();
    onConfigInstalled();
  }

  const titleId = "guided-setup-title";

  return (
    <div
      className="guided-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="guided-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="guided-head">
          <div>
            <p className="guided-kicker">Get started</p>
            <h2 id={titleId} className="guided-title">
              Guided setup
            </h2>
            <p className="guided-progress">
              Step {step + 1} of 7 — about a minute
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost guided-close"
            onClick={onClose}
            aria-label="Close guided setup"
          >
            ✕
          </button>
        </header>

        <div className="guided-body">
          {blockingError ? (
            <div className="guided-inline-error" role="alert">
              <p className="guided-inline-error-text">{blockingError}</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm guided-inline-error-dismiss"
                onClick={onDismissBlockingError}
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {step === 0 && (
            <div className="guided-step">
              <p className="guided-lead">
                This app runs a <strong>Fiber node</strong> on your computer. Your{" "}
                <strong>CKB private key file</strong> is how this node identifies
                on-chain—the same role as a wallet for Fiber (see the last step).
                We set up folders, config, and your unlock password so you can go
                from zero to a running node without the terminal.
              </p>
              <ul className="guided-bullets">
                <li>Pick testnet or mainnet</li>
                <li>Create your <code className="code-pill">config.yml</code></li>
                <li>
                  Add your CKB key file (wallet identity) and save your unlock
                  password to the system keychain
                </li>
                <li>Start the node with one click</li>
              </ul>
              <p className="guided-note">
                You can always open <strong>Setup</strong> later for advanced
                options.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="guided-step">
              <p className="guided-lead">
                Which CKB network should this node use? Most people try{" "}
                <strong>testnet</strong> first.
              </p>
              <div className="guided-cards">
                <button
                  type="button"
                  className={`guided-card${settings.network === "testnet" ? " guided-card-active" : ""}`}
                  onClick={() => {
                    applyNetworkDefaults("testnet");
                    setSettings((prev) =>
                      prev ? { ...prev, network: "testnet" } : prev,
                    );
                  }}
                >
                  <span className="guided-card-title">Testnet</span>
                  <span className="guided-card-desc">
                    Safe for learning; public test relays available.
                  </span>
                </button>
                <button
                  type="button"
                  className={`guided-card${settings.network === "mainnet" ? " guided-card-active" : ""}`}
                  onClick={() => {
                    applyNetworkDefaults("mainnet");
                    setSettings((prev) =>
                      prev ? { ...prev, network: "mainnet" } : prev,
                    );
                  }}
                >
                  <span className="guided-card-title">Mainnet</span>
                  <span className="guided-card-desc">
                    Real network — only when you are ready.
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="guided-step">
              {bundledAvailable ? (
                <>
                  <p className="guided-lead">
                    A matching Fiber node program is already included with this
                    app. Nothing to download.
                  </p>
                  <div className="guided-callout guided-callout-ok">
                    Ready to use the built-in node program.
                  </div>
                </>
              ) : (
                <>
                  <p className="guided-lead">
                    This build does not include the built-in node file next to the
                    app. The app checks that file on disk; if it is missing, use
                    the button below to download the official{" "}
                    <strong>fnn</strong> build for your computer from GitHub (same
                    version this app expects).
                  </p>
                  <div className="guided-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => void onDownloadFnn()}
                    >
                      {toolsBusy === "dl" ? "Downloading…" : "Download node program"}
                    </button>
                  </div>
                  {toolsBusy === "dl" ? (
                    <div
                      className="guided-progress"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <span className="guided-spinner" aria-hidden />
                      <div>
                        <strong className="guided-progress-title">
                          Download in progress
                        </strong>
                        <p className="guided-progress-desc">
                          Fetching the archive from GitHub and unpacking it can
                          take one to three minutes. This window stays open—please
                          wait.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {!bundledAvailable && programReady ? (
                    <div className="guided-callout guided-callout-ok">
                      A usable node program is configured (downloaded or custom
                      path). Press <strong>Continue</strong> when you are ready.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="guided-step">
              <p className="guided-lead">
                Your node will store files here. You can change these later under
                Setup → advanced.
              </p>
              <dl className="guided-paths">
                <dt>Data folder</dt>
                <dd>
                  <code>{settings.fnnDataDir}</code>
                </dd>
                <dt>Configuration file</dt>
                <dd>
                  <code>{settings.fnnConfigPath}</code>
                </dd>
              </dl>
            </div>
          )}

          {step === 4 && (
            <div className="guided-step">
              <p className="guided-lead">
                We will download the official <strong>starter config</strong> for
                your network and fill in your CKB connection address.
              </p>
              {toolsBusy === "cfg" ? (
                <div
                  className="guided-progress"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="guided-spinner" aria-hidden />
                  <div>
                    <strong className="guided-progress-title">
                      Creating config file
                    </strong>
                    <p className="guided-progress-desc">
                      Downloading the template from the Fiber repository…
                    </p>
                  </div>
                </div>
              ) : null}
              {!configInstalled ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void handleInstallConfig()}
                >
                  {toolsBusy === "cfg" ? "Working…" : "Create my config file"}
                </button>
              ) : (
                <div className="guided-callout guided-callout-ok">
                  Config file saved. Continue to set your password.
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="guided-step">
              <p className="guided-lead">
                Choose a password your node will use to unlock keys. It is stored
                only in your system keychain, not in a plain text file.
              </p>
              <label className="field guided-field">
                <span className="field-label">Node key password</span>
                <input
                  type="password"
                  className="input"
                  value={wizardPassword}
                  onChange={(e) => onWizardPasswordChange(e.target.value)}
                  placeholder="Choose a strong password"
                  autoComplete="new-password"
                />
              </label>
              {hasPw && (
                <p className="guided-note guided-note-ok">
                  A password is already saved. You can enter a new one to replace
                  it, or continue.
                </p>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!wizardPassword.trim() || busy}
                onClick={() => void onSaveWizardPassword()}
              >
                Save to keychain
              </button>
              {passwordSavedInGuided ? (
                <p className="guided-note guided-note-ok" role="status">
                  Saved to keychain. Press <strong>Continue</strong> in the bar
                  below.
                </p>
              ) : null}
            </div>
          )}

          {step === 6 && (
            <div className="guided-step">
              <p className="guided-lead">
                <strong>Connect your wallet (CKB key).</strong> Paste your
                private key (64 hex characters, optional{" "}
                <code className="code-pill">0x</code> prefix) below. It is saved
                to{" "}
                <code className="code-pill">
                  {settings.fnnDataDir.replace(/\/$/, "")}/ckb/key
                </code>
                . The password you saved only encrypts this file; it does not
                create the key.{" "}
                <a
                  className="inline-link"
                  href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Fiber docs
                </a>
                .
              </p>
              <label className="field guided-field">
                <span className="field-label">Private key (hex)</span>
                <input
                  type="password"
                  className="input input-mono"
                  value={wizardPrivKey}
                  onChange={(e) => onWizardPrivKeyChange(e.target.value)}
                  placeholder="64 hex characters"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="guided-actions guided-actions-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !wizardPrivKey.trim()}
                  onClick={() => void onSaveWizardPrivKey()}
                >
                  Save key to disk
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void onOpenKeyFolder()}
                >
                  Open key folder
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => onRefreshCkbKey()}
                >
                  Check key file
                </button>
              </div>
              {ckbKeyStatus?.ready ? (
                <div className="guided-callout guided-callout-ok" role="status">
                  Key file looks good at{" "}
                  <code className="code-pill">{ckbKeyStatus.keyPath}</code>. You can
                  start the node.
                </div>
              ) : (
                <p className="guided-note">
                  After saving, use <strong>Check key file</strong> if needed—the
                  app also scans every few seconds.
                </p>
              )}
              <p className="guided-lead">
                If something fails, open the <strong>Node</strong> tab and read the
                log messages (colors are stripped for readability).
              </p>
              <div className="guided-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !ckbKeyStatus?.ready}
                  onClick={() => void onStartNode()}
                >
                  Start my node
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    onMarkComplete();
                    onClose();
                  }}
                >
                  I will start it later
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="guided-footer">
          {step > 0 && step < 6 && (
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              Back
            </button>
          )}
          <div className="guided-footer-spacer" />
          {step === 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onDismissForLater}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onStepChange(1)}
              >
                Continue
              </button>
            </>
          )}
          {step === 1 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void goNetworkNext()}
            >
              Save & continue
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!programReady || busy}
              onClick={() => void goProgramNext()}
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void goFilesNext()}
            >
              Continue
            </button>
          )}
          {step === 4 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!configInstalled}
              onClick={() => onStepChange(5)}
            >
              Continue
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canContinuePasswordStep}
              onClick={() => onStepChange(6)}
            >
              Continue
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
