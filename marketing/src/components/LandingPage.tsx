import {
  FIBER_DESKTOP_REPO_URL,
  fiberDesktopReleasesUrl,
} from "../constants/marketing";

export function LandingPage() {
  const releasesUrl = fiberDesktopReleasesUrl();

  return (
    <div className="landing" id="top">
      <a className="landing-skip" href="#main">
        Skip to content
      </a>

      {/* ── Header ── */}
      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-current="page">
          <span className="landing-brand-mark" aria-hidden />
          <span className="landing-brand-text">
            <span className="landing-brand-title">Fiber Desktop</span>
          </span>
        </a>
        <div className="landing-header-right">
          <nav className="landing-header-nav" aria-label="Site links">
            <a className="landing-header-link" href="/how-it-works">Guides</a>
            <a className="landing-header-link" href="https://docs.fiber.world/" target="_blank" rel="noreferrer">Docs</a>
            <a className="landing-header-link" href="https://www.fiber.world/" target="_blank" rel="noreferrer">fiber.world</a>
            <a className="landing-header-link" href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <a className="landing-header-download" href={releasesUrl} target="_blank" rel="noreferrer">
            Download
          </a>
        </div>
      </header>

      <main id="main" className="landing-main">

        {/* ── Hero ── */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-kicker">
                <span className="landing-kicker-dot" aria-hidden />
                macOS &amp; Windows · native app
              </p>
              <h1 id="hero-title">
                Your Fiber node,{" "}
                <span className="landing-hero-accent">one focused app</span>
              </h1>
              <p className="landing-hero-lead">
                Fiber Desktop wraps the official <strong className="text-accent">fnn</strong> binary
                in a guided desktop UI—so you can run a Nervos CKB payment-channel node without
                touching the terminal.
              </p>
              <div className="landing-cta-row">
                <a className="landing-cta-primary" href={releasesUrl} target="_blank" rel="noreferrer">
                  <span className="landing-cta-label">Download Fiber Desktop</span>
                  <span className="landing-cta-meta">macOS &amp; Windows · free</span>
                </a>
                <a className="landing-cta-secondary" href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md" target="_blank" rel="noreferrer">
                  Node setup guide
                </a>
              </div>
            </div>

            {/* decorative window mockup */}
            <div className="landing-window" aria-hidden="true">
              <div className="landing-window-chrome">
                <span className="landing-window-dot landing-window-dot-red" />
                <span className="landing-window-dot landing-window-dot-yellow" />
                <span className="landing-window-dot landing-window-dot-green" />
                <span className="landing-window-chrome-title">Fiber Desktop</span>
              </div>
              <div className="landing-window-body">
                <div className="landing-window-sidebar">
                  <span className="landing-window-nav landing-window-nav-active">Overview</span>
                  <span className="landing-window-nav">Setup</span>
                  <span className="landing-window-nav">Node</span>
                  <span className="landing-window-nav">Payments</span>
                  <span className="landing-window-nav">Network</span>
                </div>
                <div className="landing-window-content">
                  <div className="landing-window-status">
                    <span className="landing-window-status-dot" />
                    Running · PID 31022
                  </div>
                  <div className="landing-window-bar landing-window-bar-full" />
                  <div className="landing-window-bar" />
                  <div className="landing-window-bar landing-window-bar-half" />
                  <div className="landing-window-btns">
                    <span className="landing-window-btn landing-window-btn-accent" />
                    <span className="landing-window-btn" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="landing-section" aria-labelledby="features-title">
          <div className="landing-section-label">
            <p className="landing-eyebrow">What's inside</p>
            <h2 id="features-title" className="landing-h2">
              Everything you need to run Fiber locally
            </h2>
          </div>
          <div className="landing-features">
            <article className="landing-card">
              <span className="landing-card-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 9v12h16V9l-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="landing-card-title">Guided setup</h3>
              <p className="landing-card-text">
                Step-by-step wizard: network, config, CKB key file, keychain password, start. Nothing to guess.
              </p>
            </article>
            <article className="landing-card">
              <span className="landing-card-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="landing-card-title">Bundled fnn binary</h3>
              <p className="landing-card-text">
                Ships with a tested, pinned Fiber node for your OS. One click to refresh when a new release drops.
              </p>
            </article>
            <article className="landing-card">
              <span className="landing-card-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h4l2 8 4-16 2 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="landing-card-title">Network &amp; RPC</h3>
              <p className="landing-card-text">
                Connect to public relays, open channels, create invoices, and send payments—JSON output alongside every action.
              </p>
            </article>
            <article className="landing-card">
              <span className="landing-card-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <h3 className="landing-card-title">Keychain security</h3>
              <p className="landing-card-text">
                Unlock password lives in the OS keychain—never in a plain settings file. Your key stays yours.
              </p>
            </article>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="landing-section" aria-labelledby="steps-title">
          <div className="landing-section-label">
            <p className="landing-eyebrow">How it works</p>
            <h2 id="steps-title" className="landing-h2">Three steps to a live node</h2>
          </div>
          <ol className="landing-steps">
            <li className="landing-step">
              <span className="landing-step-num">1</span>
              <div>
                <h3 className="landing-step-title">Install</h3>
                <p className="landing-step-text">Download the build for your OS, install it like any desktop app, and open Fiber Desktop.</p>
              </div>
            </li>
            <li className="landing-step">
              <span className="landing-step-num">2</span>
              <div>
                <h3 className="landing-step-title">Configure</h3>
                <p className="landing-step-text">Run the guided setup: choose testnet or mainnet, place your CKB key file, save your password.</p>
              </div>
            </li>
            <li className="landing-step">
              <span className="landing-step-num">3</span>
              <div>
                <h3 className="landing-step-title">Go live</h3>
                <p className="landing-step-text">Start fnn, watch the live log, connect to public relays, and try channel and payment flows.</p>
                <p className="landing-step-text" style={{ marginTop: "0.5rem" }}>
                  <a href="/how-it-works">Open step-by-step guides →</a>
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* ── CTA band ── */}
        <section className="landing-cta-band" aria-labelledby="cta-title">
          <h2 id="cta-title" className="landing-cta-band-title">Ready to run your own Fiber node?</h2>
          <p className="landing-cta-band-sub">
            Download the latest release and follow the in-app guided setup.
          </p>
          <div className="landing-cta-row landing-cta-row-center">
            <a className="landing-cta-primary" href={releasesUrl} target="_blank" rel="noreferrer">
              <span className="landing-cta-label">Download Fiber Desktop</span>
              <span className="landing-cta-meta">GitHub Releases · free</span>
            </a>
            <a className="landing-cta-ghost" href="https://docs.fiber.world/" target="_blank" rel="noreferrer">
              Read the docs
            </a>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
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
            <a href={releasesUrl} target="_blank" rel="noreferrer">Releases</a>
            <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">Source code</a>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-col-title">Fiber</span>
            <a href="https://github.com/nervosnetwork/fiber/releases" target="_blank" rel="noreferrer">fnn releases</a>
            <a href="https://github.com/nervosnetwork/fiber" target="_blank" rel="noreferrer">Protocol repo</a>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-col-title">Learn</span>
            <a href="/how-it-works">Guides</a>
            <a href="https://docs.fiber.world/" target="_blank" rel="noreferrer">Documentation</a>
            <a href="https://www.fiber.world/" target="_blank" rel="noreferrer">fiber.world</a>
          </div>
        </div>
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Fiber Desktop contributors.
          You keep your keys and your node data.
        </p>
      </footer>
    </div>
  );
}
