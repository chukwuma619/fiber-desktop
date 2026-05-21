import type { NodePresenceKind } from "../lib/nodePresence";
import {
  nodePresenceHeroSubFullTitle,
  nodePresenceHeroSubOneLine,
  nodePresenceStatusLabel,
} from "../lib/nodePresence";
import type { AppSettings, CkbKeyStatus, FnnBinaryStatus, FnnStatusView, PinnedFnnInfo } from "../types/settings";
import { fnnBinarySourceLabel } from "../types/settings";
import { StartStopNodeButton } from "./StartStopNodeButton";

type OverviewTabProps = {
  guidanceComplete: boolean;
  nodePresence: NodePresenceKind;
  fnnStatus: FnnStatusView | null;
  ckbKeyStatus: CkbKeyStatus | null;
  settings: AppSettings | null;
  pinnedInfo: PinnedFnnInfo | null;
  fnnBinaryStatus: FnnBinaryStatus | null;
  onOpenGuided: () => void;
  onMarkGuidanceComplete: () => void;
  onGoToTab: (tab: "setup" | "node" | "network") => void;
  onStartNode: () => void | Promise<void>;
  onStopNode: () => void | Promise<void>;
};

export function OverviewTab({
  guidanceComplete,
  nodePresence,
  fnnStatus,
  ckbKeyStatus,
  settings,
  pinnedInfo,
  fnnBinaryStatus,
  onOpenGuided,
  onMarkGuidanceComplete,
  onGoToTab,
  onStartNode,
  onStopNode,
}: OverviewTabProps) {
  const statusLabel = nodePresenceStatusLabel(nodePresence);
  const bundledVersionLabel =
    pinnedInfo?.tag ?? fnnBinaryStatus?.pinnedTag ?? "—";
  const usingLabel =
    fnnBinaryStatus == null
      ? "…"
      : fnnBinarySourceLabel(fnnBinaryStatus.activeSource);

  return (
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
              onClick={onOpenGuided}
            >
              Guided setup
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onGoToTab("setup")}
            >
              Open full setup
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onMarkGuidanceComplete}
            >
              I am already set up
            </button>
          </div>
        </section>
      )}

      <section className="panel panel-hero">
        <h2 className="sr-only">Node status</h2>
        <div className="overview-hero-inner">
          <div className="stat-pill-row" role="group" aria-label="At a glance">
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
                  pinnedInfo?.assetFileName ? pinnedInfo.assetFileName : undefined
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
              <span
                className="hero-sub"
                title={nodePresenceHeroSubFullTitle(nodePresence)}
              >
                {nodePresenceHeroSubOneLine(nodePresence)}
              </span>
            </div>
            <div className="hero-actions">
              <StartStopNodeButton
                locallyRunning={fnnStatus?.kind === "running"}
                disableStartBecauseRemote={nodePresence === "remote"}
                onStart={onStartNode}
                onStop={onStopNode}
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
              <span className="overview-info-v">{usingLabel}</span>
            </div>
            <div className="overview-hero-footer-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onGoToTab("setup")}
              >
                Node settings
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onOpenGuided}
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
            onClick={() => onGoToTab("setup")}
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
            onClick={() => onGoToTab("node")}
          >
            <span className="next-step-card-icon" aria-hidden>
              ⬡
            </span>
            <span className="next-step-card-title">Node</span>
            <span className="next-step-card-desc">Start, stop, and logs</span>
          </button>
          <button
            type="button"
            className="next-step-card"
            onClick={() => onGoToTab("network")}
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
  );
}
