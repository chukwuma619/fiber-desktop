import { useMemo } from "react";
import {
  FIBER_DESKTOP_REPO_URL,
  fiberDesktopReleasesUrl,
} from "../constants/marketing";
import { useLatestReleaseDownload } from "../hooks/useLatestReleaseDownload";
import type { ClientOs } from "../lib/clientOs";
import {
  formatFileSize,
  installerKindLabel,
  osLabel,
  type InstallerRow,
} from "../lib/releaseInstallers";
import "../DownloadPage.css";
import { GuideChrome } from "./guides/GuideChrome";
import { Callout } from "./guides/guidePrimitives";

function groupByOs(rows: InstallerRow[]): Record<ClientOs, InstallerRow[]> {
  const buckets: Record<ClientOs, InstallerRow[]> = {
    macos: [],
    windows: [],
    linux: [],
    unknown: [],
  };
  for (const r of rows) {
    buckets[r.os].push(r);
  }
  return buckets;
}

export function DownloadPage() {
  const releasesPageUrl = fiberDesktopReleasesUrl();
  const { clientOs, state, recommended, retry } = useLatestReleaseDownload();

  const grouped = useMemo(() => {
    if (state.status !== "ok") return null;
    return groupByOs(state.rows);
  }, [state]);

  const osOrder: ClientOs[] = ["macos", "windows", "linux"];

  return (
    <GuideChrome
      heroEyebrow="Get the app"
      heroTitle="Download Fiber Desktop"
      heroSub="We detect your OS for the primary button. Prefer another format? Grab any installer below—same release, your choice."
    >
      {state.status === "loading" || state.status === "idle" ? (
        <div className="dl-panel">
          <p className="dl-panel-muted">Loading the latest release from GitHub…</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <Callout kind="warn">
          <strong>Could not load release metadata.</strong> {state.message}{" "}
          <a href={releasesPageUrl} target="_blank" rel="noreferrer">
            Browse releases on GitHub
          </a>{" "}
          and download the file for your system.{" "}
          <button
            type="button"
            onClick={retry}
            style={{ marginLeft: "0.5rem", cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0, color: "inherit", font: "inherit" }}
          >
            Try again
          </button>
        </Callout>
      ) : null}

      {state.status === "ok" && state.rows.length === 0 ? (
        <Callout kind="info">
          This release has no recognized installer attachments yet (.dmg, .exe, .msi, .deb,
          .AppImage, etc.).{" "}
          <a href={releasesPageUrl} target="_blank" rel="noreferrer">
            Open the release on GitHub
          </a>{" "}
          to see all uploaded files.
        </Callout>
      ) : null}

      {state.status === "ok" && state.rows.length > 0 ? (
        <>
          <div className="dl-panel dl-primary">
            <div className="dl-primary-copy">
              <p className="dl-detect">
                Detected OS
                <span className="dl-detect-badge">{osLabel(clientOs)}</span>
              </p>
              <p className="dl-version">
                Latest release{" "}
                <code>
                  {state.release.name?.trim() || state.release.tag_name}
                </code>
                {recommended ? (
                  <span className="dl-version-meta">
                    {" "}
                    · {formatFileSize(recommended.size)}
                  </span>
                ) : null}
              </p>
              {recommended ? (
                <p className="dl-file">{recommended.name}</p>
              ) : (
                <p className="dl-file">
                  We could not pick a single default for this browser/OS. Choose an installer
                  under your platform below.
                </p>
              )}
            </div>
            <div className="dl-actions">
              {recommended ? (
                <a className="dl-btn dl-btn-primary" href={recommended.url}>
                  Download for {osLabel(clientOs)}
                </a>
              ) : (
                <button type="button" className="dl-btn dl-btn-primary" disabled>
                  Choose a platform below
                </button>
              )}
              <a
                className="dl-btn dl-btn-ghost"
                href={releasesPageUrl}
                target="_blank"
                rel="noreferrer"
              >
                All releases on GitHub
              </a>
            </div>
          </div>

          <h2 className="dl-section-title">Other platforms &amp; formats</h2>
          <p className="dl-section-sub">
            Each link points at the same GitHub release asset. Pick the installer that matches
            how you install apps on your machine.
          </p>

          <div className="dl-grid">
            {osOrder.map((os) => (
              <div key={os} className="dl-card">
                <div className="dl-card-head">
                  <span className="dl-card-icon" aria-hidden>
                    {os === "macos" ? "🍎" : os === "windows" ? "🪟" : "🐧"}
                  </span>
                  <h3 className="dl-card-title">{osLabel(os)}</h3>
                </div>
                {grouped && grouped[os].length > 0 ? (
                  <ul className="dl-card-list">
                    {grouped[os].map((row) => (
                      <li key={row.url}>
                        <a className="dl-card-link" href={row.url}>
                          <span className="dl-card-link-name">
                            {installerKindLabel(row.installerKind)}
                          </span>
                          <span className="dl-card-link-meta">
                            {row.name} · {formatFileSize(row.size)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dl-card-empty">No installer listed for this release.</p>
                )}
              </div>
            ))}
          </div>

          <p className="dl-foot">
            Prefer the command line? The desktop app bundles the official{" "}
            <a href="https://github.com/nervosnetwork/fiber/releases" target="_blank" rel="noreferrer">
              fnn
            </a>{" "}
            binary. Repository:{" "}
            <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
              {FIBER_DESKTOP_REPO_URL.replace("https://", "")}
            </a>
            .
          </p>
        </>
      ) : null}
    </GuideChrome>
  );
}
