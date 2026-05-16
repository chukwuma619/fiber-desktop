import type { ReactNode } from "react";
import {
  FIBER_DESKTOP_REPO_URL,
  fiberDesktopReleasesUrl,
} from "../../constants/marketing";

type GuideChromeProps = {
  heroEyebrow: string;
  heroTitle: string;
  heroSub?: string;
  children: ReactNode;
};

export function GuideChrome({
  heroEyebrow,
  heroTitle,
  heroSub,
  children,
}: GuideChromeProps) {
  const releasesUrl = fiberDesktopReleasesUrl();

  return (
    <div className="hiw-page">
      <div className="hiw-hero">
        <div className="hiw-hero-inner">
          <p className="landing-eyebrow">{heroEyebrow}</p>
          <h1 className="hiw-hero-title">{heroTitle}</h1>
          {heroSub ? <p className="hiw-hero-sub">{heroSub}</p> : null}
        </div>
      </div>

      <div className="hiw-body hiw-body-single">
        <article id="main" className="hiw-article hiw-article-flush">
          {children}
        </article>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <span className="landing-footer-mark" aria-hidden />
            <div>
              <strong>Fiber Desktop</strong>
              <p>Open-source desktop shell for fnn on Nervos CKB.</p>
            </div>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-col-title">Product</span>
            <a href="/download">Download</a>
            <a href={releasesUrl} target="_blank" rel="noreferrer">
              Releases
            </a>
            <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
              Source code
            </a>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-col-title">Fiber</span>
            <a
              href="https://github.com/nervosnetwork/fiber/releases"
              target="_blank"
              rel="noreferrer"
            >
              fnn releases
            </a>
            <a
              href="https://github.com/nervosnetwork/fiber"
              target="_blank"
              rel="noreferrer"
            >
              Protocol repo
            </a>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-col-title">Learn</span>
            <a href="https://docs.fiber.world/" target="_blank" rel="noreferrer">
              Documentation
            </a>
            <a href="https://www.fiber.world/" target="_blank" rel="noreferrer">
              fiber.world
            </a>
          </div>
        </div>
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Fiber Desktop contributors. You keep your keys and your
          node data.
        </p>
      </footer>
    </div>
  );
}
