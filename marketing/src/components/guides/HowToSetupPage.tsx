import { Link } from "react-router-dom";
import { FIBER_DESKTOP_REPO_URL, fiberDesktopReleasesUrl } from "../../constants/marketing";
import { GuideChrome } from "./GuideChrome";
import { Callout, Code, Pill, Step } from "./guidePrimitives";

export function HowToSetupPage() {
  const releasesUrl = fiberDesktopReleasesUrl();

  return (
    <GuideChrome
      heroEyebrow="Guide"
      heroTitle="How to set up Fiber Desktop"
      heroSub="From download to a running node: install, keys, password, and first start."
    >
      <section className="hiw-section hiw-section-tight" id="install">
        <h2 className="hiw-h2">Install &amp; first launch</h2>
        <p>
          Download the installer for your OS from the{" "}
          <Link to="/download">downloads page</Link> or{" "}
          <a href={releasesUrl} target="_blank" rel="noreferrer">
            GitHub Releases
          </a>
          .
        </p>
        <div className="hiw-platform-grid">
          <div className="hiw-platform-card">
            <span className="hiw-platform-icon" aria-hidden>
              🍎
            </span>
            <h3>macOS</h3>
            <p>
              Open the <Code>.dmg</Code>, drag <strong>Fiber Desktop</strong> to Applications. If
              Gatekeeper blocks the app, allow it under System Settings → Privacy &amp; Security.
            </p>
          </div>
          <div className="hiw-platform-card">
            <span className="hiw-platform-icon" aria-hidden>
              🪟
            </span>
            <h3>Windows</h3>
            <p>
              Run the <Code>.msi</Code> installer. If SmartScreen warns, use More info → Run anyway.
            </p>
          </div>
        </div>
        <p>
          On first launch, the <strong>Guided setup</strong> wizard may open automatically from the
          Overview tab.
        </p>
      </section>

      <section className="hiw-section hiw-section-tight" id="guided-setup">
        <h2 className="hiw-h2">Guided setup (in the app)</h2>
        <p>The wizard walks prerequisites in order before you press Start.</p>
        <div className="hiw-steps">
          <Step
            n={1}
            text="Choose network — Testnet (recommended to start) or Mainnet."
          />
          <Step
            n={2}
            text="Confirm data folder and config path. Defaults work unless you already use fnn elsewhere."
          />
          <Step
            n={3}
            text="Use the bundled fnn or download the pinned release from Setup if needed."
          />
          <Step
            n={4}
            text="Place your CKB private key as one line of hex in ckb/key inside your data directory (the Node tab can open that folder for you)."
          />
          <Step
            n={5}
            text="Save the node key password to the OS keychain—it unlocks fnn; it is not stored in settings files."
          />
          <Step n={6} text="Start the node from the wizard or Node tab." />
        </div>
        <Callout kind="warn">
          Export keys with <Code>ckb-cli account export</Code> and back them up. Losing the key can
          strand funds in open channels.
        </Callout>
      </section>

      <section className="hiw-section hiw-section-tight" id="start-node">
        <h2 className="hiw-h2">Starting your node</h2>
        <p>
          Use <Pill>Overview</Pill> or <Pill>Node</Pill> → <strong>Start node</strong>. The status
          chip shows <strong>Running</strong> when fnn is up, <strong>Stopped</strong> when it is
          not, and <strong>Crashed</strong> if it exited—read the log on the Node tab for errors.
        </p>
        <p>
          <strong>Stop node</strong> shuts down the local process; it does not delete your channels
          on-chain.
        </p>
      </section>

      <section className="hiw-section hiw-section-tight" id="logs">
        <h2 className="hiw-h2">Logs &amp; troubleshooting</h2>
        <p>
          The <Pill>Node</Pill> tab shows recent <Code>fnn</Code> output. Common issues: missing key
          file, wrong password, port 8227 already in use (change config and Setup → Node API URL),
          or two copies of fnn pointing at the same data directory (database lock).
        </p>
        <div className="hiw-trouble-grid">
          <div className="hiw-trouble-item">
            <h3>No route / payment fails</h3>
            <p>
              Open <Pill>Channels</Pill>, connect a relay, open a channel, wait for ready, then
              open <Pill>Send</Pill> and retry. See also{" "}
              <a href="/how-to-send">How to send</a>.
            </p>
          </div>
          <div className="hiw-trouble-item">
            <h3>More help</h3>
            <p>
              <a
                href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md"
                target="_blank"
                rel="noreferrer"
              >
                Fiber testnet nodes
              </a>
              {" · "}
              <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
                Fiber Desktop issues
              </a>
            </p>
          </div>
        </div>
      </section>

      <p className="hiw-back-link">
        <a href="/how-it-works">← All guides</a>
      </p>
    </GuideChrome>
  );
}
