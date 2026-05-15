import { FIBER_DESKTOP_REPO_URL, fiberDesktopReleasesUrl } from "../../constants/marketing";
import { GuideChrome } from "./GuideChrome";
import { Callout } from "./guidePrimitives";

export function GuidesIndexPage() {
  const releasesUrl = fiberDesktopReleasesUrl();

  const cards = [
    {
      href: "/how-to-send.html",
      title: "How to send",
      desc: "Open a channel, wait until it is ready, pay an invoice, and verify the payment.",
    },
    {
      href: "/how-to-receive.html",
      title: "How to receive",
      desc: "Connect to the network, get a ready channel, create an invoice, and share it.",
    },
    {
      href: "/about-project.html",
      title: "About this project",
      desc: "What Fiber Desktop is, how it relates to Fiber and CKB, and where the code lives.",
    },
    {
      href: "/how-to-setup.html",
      title: "How to set up",
      desc: "Install the app, guided wizard, start your node, and fix common issues.",
    },
  ];

  return (
    <GuideChrome
      activeNav="index"
      heroEyebrow="Guides"
      heroTitle="Fiber Desktop guides"
      heroSub="Pick a topic. Each page is self-contained so you can link someone directly to “How to send” or “How to receive.”"
    >
      <Callout kind="info">
        In the app, most payment actions live under the <strong>Payments</strong> tab. The{" "}
        <strong>Network</strong> tab is a lighter view for node info and channel lists.
      </Callout>

      <div className="hiw-guide-grid">
        {cards.map((c) => (
          <a key={c.href} className="hiw-guide-card" href={c.href}>
            <h2 className="hiw-guide-card-title">{c.title}</h2>
            <p className="hiw-guide-card-desc">{c.desc}</p>
            <span className="hiw-guide-card-cta">Open guide →</span>
          </a>
        ))}
      </div>

      <div className="hiw-end-cta">
        <h2>Ready to try it?</h2>
        <p>Download Fiber Desktop and run the guided setup from the Overview tab.</p>
        <div className="landing-cta-row">
          <a className="landing-cta-primary" href={releasesUrl} target="_blank" rel="noreferrer">
            <span className="landing-cta-label">Download Fiber Desktop</span>
            <span className="landing-cta-meta">macOS &amp; Windows · free</span>
          </a>
          <a className="landing-cta-secondary" href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </div>
    </GuideChrome>
  );
}
