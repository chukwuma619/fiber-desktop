import { Link, useLocation } from "react-router-dom";
import { FIBER_DESKTOP_REPO_URL } from "../constants/marketing";

function linkClass(active: boolean): string {
  return `landing-header-link${active ? " landing-header-link-active" : ""}`;
}

export function SiteNavbar() {
  const { pathname } = useLocation();
  const isDownload = pathname === "/download";
  const guidesActive =
    pathname === "/how-it-works" ||
    pathname === "/how-to-send" ||
    pathname === "/how-to-receive" ||
    pathname === "/how-to-setup";
  const aboutActive = pathname === "/about-project";

  return (
    <>
      <a className="landing-skip" href="#main">
        Skip to content
      </a>
      <header className="landing-header">
        <Link
          className="landing-brand"
          to="/"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <span className="landing-brand-mark" aria-hidden />
          <span className="landing-brand-text">
            <span className="landing-brand-title">Fiber Desktop</span>
          </span>
        </Link>
        <nav
          className="landing-header-nav landing-header-nav-centered"
          aria-label="Site links"
        >
          <Link className={linkClass(aboutActive)} to="/about-project">
            About
          </Link>

          <Link className={linkClass(guidesActive)} to="/how-it-works">
            Guides
          </Link>

          <a
            className="landing-header-link"
            href={FIBER_DESKTOP_REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <Link
          className={`landing-header-download${
            isDownload ? " landing-header-download-active" : ""
          }`}
          to="/download"
          aria-current={isDownload ? "page" : undefined}
        >
          Download
        </Link>
      </header>
    </>
  );
}
