import { Link } from "react-router-dom";
import { useLatestReleaseDownload } from "../hooks/useLatestReleaseDownload";
import { formatFileSize, osLabel } from "../lib/releaseInstallers";

type LandingDownloadCtaProps = {
  /** Center-align the button stack (bottom CTA band). */
  centered?: boolean;
};

export function LandingDownloadCta({ centered = false }: LandingDownloadCtaProps) {
  const { clientOs, state, recommended } = useLatestReleaseDownload();

  const release =
    state.status === "ok" ? state.release : undefined;

  const primaryLabel =
    state.status === "loading" || state.status === "idle"
      ? "Preparing download…"
      : recommended
        ? `Download for ${osLabel(clientOs)}`
        : clientOs === "unknown"
          ? "Download Fiber Desktop"
          : "Choose your platform";

  const primaryMeta = recommended && release
    ? `${release.tag_name} · ${formatFileSize(recommended.size)} · free`
    : clientOs === "unknown"
      ? "macOS, Windows & Linux"
      : "macOS & Windows · free";

  const primaryBusy = state.status === "loading" || state.status === "idle";

  return (
    <div
      className={`landing-cta-stack${centered ? " landing-cta-stack-center" : ""}`}
    >
      {recommended ? (
        <a
          className="landing-cta-primary"
          href={recommended.url}
        >
          <span className="landing-cta-label">{primaryLabel}</span>
          <span className="landing-cta-meta">{primaryMeta}</span>
        </a>
      ) : primaryBusy ? (
        <span
          className="landing-cta-primary landing-cta-primary-busy"
          aria-busy="true"
        >
          <span className="landing-cta-label">{primaryLabel}</span>
          <span className="landing-cta-meta">{primaryMeta}</span>
        </span>
      ) : (
        <Link className="landing-cta-primary" to="/download">
          <span className="landing-cta-label">{primaryLabel}</span>
          <span className="landing-cta-meta">{primaryMeta}</span>
        </Link>
      )}

      <Link className="landing-cta-other" to="/download">
        Other platforms
      </Link>
    </div>
  );
}
