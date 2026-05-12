import {
  FIBER_DESKTOP_REPO_URL,
  fiberDesktopReleasesUrl,
} from "../constants/marketing";

const TOC = [
  { id: "what-is", label: "What is Fiber Desktop?" },
  { id: "install", label: "Install & first launch" },
  { id: "guided-setup", label: "Guided setup" },
  { id: "start-node", label: "Starting your node" },
  { id: "connect-network", label: "Connecting to the network" },
  { id: "receive-payment", label: "Receiving a payment" },
  { id: "send-payment", label: "Sending a payment" },
  { id: "open-channel", label: "Opening a channel" },
  { id: "logs", label: "Logs & troubleshooting" },
];

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="hiw-step">
      <span className="hiw-step-num">{n}</span>
      <p className="hiw-step-text">{text}</p>
    </div>
  );
}

function Callout({
  kind = "info",
  children,
}: {
  kind?: "info" | "warn" | "tip";
  children: React.ReactNode;
}) {
  return <div className={`hiw-callout hiw-callout-${kind}`}>{children}</div>;
}

function Code({ children }: { children: string }) {
  return <code className="hiw-code">{children}</code>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="hiw-pill">{children}</span>;
}

export function HowItWorksPage() {
  const releasesUrl = fiberDesktopReleasesUrl();

  return (
    <div className="hiw-page">
      {/* ── Header ── */}
      <header className="landing-header">
        <a className="landing-brand" href="/index.html">
          <span className="landing-brand-mark" aria-hidden />
          <span className="landing-brand-title">Fiber Desktop</span>
        </a>
        <div className="landing-header-right">
          <nav className="landing-header-nav" aria-label="Site links">
            <a className="landing-header-link" href="/index.html">Home</a>
            <a className="landing-header-link landing-header-link-active" href="/how-it-works.html" aria-current="page">How it works</a>
            <a className="landing-header-link" href="https://docs.fiber.world/" target="_blank" rel="noreferrer">Docs</a>
            <a className="landing-header-link" href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <a className="landing-header-download" href={releasesUrl} target="_blank" rel="noreferrer">
            Download
          </a>
        </div>
      </header>

      {/* ── Page hero ── */}
      <div className="hiw-hero">
        <div className="hiw-hero-inner">
          <p className="landing-eyebrow">Guide</p>
          <h1 className="hiw-hero-title">How Fiber Desktop works</h1>
          <p className="hiw-hero-sub">
            Everything from installation to sending your first payment on the Fiber Network—explained step by step.
          </p>
        </div>
      </div>

      {/* ── Body: sidebar + article ── */}
      <div className="hiw-body">
        {/* Sidebar TOC */}
        <aside className="hiw-toc" aria-label="On this page">
          <p className="hiw-toc-title">On this page</p>
          <nav>
            <ul className="hiw-toc-list">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a className="hiw-toc-link" href={`#${item.id}`}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Article */}
        <article className="hiw-article">

          {/* ── What is Fiber Desktop ── */}
          <section id="what-is" className="hiw-section">
            <h2 className="hiw-h2">What is Fiber Desktop?</h2>
            <p>
              <strong>Fiber Desktop</strong> is a native macOS and Windows application that runs a{" "}
              <strong>Fiber Network Node</strong> (<Code>fnn</Code>) locally on your machine.
              It gives you a full graphical UI to do everything you would otherwise do in a terminal:
              configure the node, manage your CKB key file, monitor live logs, connect to peers,
              open payment channels, and send or receive CKB payments over the Fiber Network.
            </p>
            <p>
              The <strong>Fiber Network</strong> is a payment-channel protocol built on{" "}
              <strong>Nervos CKB</strong>—similar in concept to the Bitcoin Lightning Network.
              Payments are routed off-chain through bidirectional channels, settling on CKB only
              when channels are opened or closed, keeping fees low and confirmations instant.
            </p>
            <Callout kind="info">
              Fiber Desktop is <strong>not</strong> a browser extension or web wallet. It is a
              full desktop installer. The node runs on your machine; you hold your own keys.
            </Callout>
          </section>

          {/* ── Install ── */}
          <section id="install" className="hiw-section">
            <h2 className="hiw-h2">Install &amp; first launch</h2>
            <p>
              Fiber Desktop ships a pre-built installer for both platforms. No Rust toolchain or
              terminal setup is needed to run it.
            </p>
            <div className="hiw-platform-grid">
              <div className="hiw-platform-card">
                <span className="hiw-platform-icon" aria-hidden>🍎</span>
                <h3>macOS</h3>
                <p>
                  Download the <Code>.dmg</Code> file, open it, and drag <strong>Fiber Desktop</strong>{" "}
                  to your Applications folder. On first launch macOS may show a Gatekeeper
                  prompt—click <strong>Open Anyway</strong> in System Settings → Privacy &amp; Security.
                </p>
              </div>
              <div className="hiw-platform-card">
                <span className="hiw-platform-icon" aria-hidden>🪟</span>
                <h3>Windows</h3>
                <p>
                  Download the <Code>.msi</Code> installer and run it. Windows SmartScreen may
                  display a warning for unsigned apps—click <strong>More info → Run anyway</strong>.
                </p>
              </div>
            </div>
            <p>
              After launch you will see the <Pill>Overview</Pill> tab. If this is your first run,
              the <strong>Guided setup wizard</strong> opens automatically.
            </p>
          </section>

          {/* ── Guided setup ── */}
          <section id="guided-setup" className="hiw-section">
            <h2 className="hiw-h2">Guided setup</h2>
            <p>
              The wizard walks through every prerequisite in order so the node has everything it
              needs before you hit <strong>Start</strong>.
            </p>
            <div className="hiw-steps">
              <Step n={1} text="Choose network — Testnet (default) or Mainnet. Testnet uses test CKB with no real value; start there." />
              <Step n={2} text="Confirm your data folder and config file paths. The defaults work for most installs; change them only if you have an existing fnn setup elsewhere." />
              <Step n={3} text='Download or verify the bundled fnn binary. Click "Use app-included node" unless you need a specific build.' />
              <Step n={4} text="Place your CKB key file. Use Open the key folder to find the exact directory, then copy your exported private-key file there named key (one line of hex)." />
              <Step n={5} text="Set your keychain password. This password encrypts the key file when fnn starts. It is stored in your OS keychain—not in any plain settings file." />
              <Step n={6} text='Click Start node. The wizard marks setup complete and takes you to the Node tab.' />
            </div>
            <Callout kind="warn">
              The CKB key file is your on-chain identity for Fiber. Export it with{" "}
              <Code>ckb-cli account export</Code> and keep a safe backup. Losing it means
              losing access to any open channels that have not been closed.
            </Callout>
          </section>

          {/* ── Start node ── */}
          <section id="start-node" className="hiw-section">
            <h2 className="hiw-h2">Starting your node</h2>
            <p>
              Once setup is complete, go to the <Pill>Overview</Pill> or <Pill>Node</Pill> tab and
              click <strong>Start node</strong>. Fiber Desktop launches <Code>fnn</Code> as a
              background process and streams its output into the log view.
            </p>
            <div className="hiw-status-examples">
              <div className="hiw-status-example hiw-status-running">
                <span className="hiw-status-dot" />
                <div>
                  <strong>Running</strong>
                  <p>fnn is active. A PID is shown in the top-right status chip. The node is accepting connections and is ready for channel and payment operations.</p>
                </div>
              </div>
              <div className="hiw-status-example hiw-status-stopped">
                <span className="hiw-status-dot" />
                <div>
                  <strong>Stopped</strong>
                  <p>fnn is not running. Any peer connections are offline. Click <strong>Start node</strong> to bring it back up.</p>
                </div>
              </div>
              <div className="hiw-status-example hiw-status-crashed">
                <span className="hiw-status-dot" />
                <div>
                  <strong>Crashed</strong>
                  <p>fnn exited unexpectedly. Check the log view on the Node tab for the error. Common causes: missing key file, wrong password, or a port conflict.</p>
                </div>
              </div>
            </div>
            <p>
              Click <strong>Stop</strong> at any time to gracefully shut down the node. Your
              channels remain open on-chain; they are not affected by stopping the app.
            </p>
          </section>

          {/* ── Connect ── */}
          <section id="connect-network" className="hiw-section">
            <h2 className="hiw-h2">Connecting to the network</h2>
            <p>
              Open the <Pill>Network</Pill> tab while your node is running. The top of the panel
              shows quick-connect buttons for the official public relays documented at{" "}
              <a href="https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md" target="_blank" rel="noreferrer">
                fiber/docs/public-nodes.md
              </a>.
            </p>
            <div className="hiw-steps">
              <Step n={1} text='Click "Connect relay 1" or "Connect relay 2". The button calls the connect_peer RPC with the relay node&apos;s public key pre-filled.' />
              <Step n={2} text='Click "Node info" to confirm the connection. The JSON response includes your node ID and peer list.' />
              <Step n={3} text='Click "Network map" to fetch graph_nodes and see other participants on the network (limit 50).' />
            </div>
            <Callout kind="tip">
              You do not need an open channel just to connect to a peer. Connecting establishes a
              P2P link. Channels are a separate step that locks CKB on-chain.
            </Callout>
          </section>

          {/* ── Receive payment ── */}
          <section id="receive-payment" className="hiw-section">
            <h2 className="hiw-h2">Receiving a payment</h2>
            <p>
              To receive CKB over Fiber you create a <strong>payment invoice</strong>. The payer
              uses this invoice string to route the payment to you through the channel network.
            </p>
            <div className="hiw-steps">
              <Step n={1} text="Make sure your node is running and connected to at least one peer (see Connect to the network above)." />
              <Step n={2} text='Go to the Network tab. Under "Channels & payments", find the "New invoice" block.' />
              <Step n={3} text='Enter the amount in hex. For example, 0x5f5e100 is 100,000,000 Shannon = 1 CKB. Use the testnet currency "Fibt" (or "Fibb" for mainnet).' />
              <Step n={4} text='Click "Create invoice". The JSON result in the right panel contains your invoice string — it starts with "fibt" on testnet.' />
              <Step n={5} text="Copy the invoice string and share it with the sender." />
            </div>
            <div className="hiw-snippet">
              <div className="hiw-snippet-bar">Example invoice response</div>
              <pre className="hiw-snippet-body">{`{
  "invoice_address": "fibt1...",
  "invoice": {
    "currency": "Fibt",
    "amount": "0x5f5e100",
    "description": "fiber-desktop"
  }
}`}</pre>
            </div>
            <Callout kind="info">
              The payer must have a funded channel with a path to your node. On testnet, opening
              a channel to one of the public relays is the easiest way to become reachable.
            </Callout>
          </section>

          {/* ── Send payment ── */}
          <section id="send-payment" className="hiw-section">
            <h2 className="hiw-h2">Sending a payment</h2>
            <p>
              Sending a payment consumes capacity from an existing channel between you and the
              payee (directly or routed through the network). You need an <strong>invoice string</strong>{" "}
              from the recipient.
            </p>
            <div className="hiw-steps">
              <Step n={1} text="Make sure your node is running and you have at least one funded channel open." />
              <Step n={2} text='Go to Network → "Send payment — invoice".' />
              <Step n={3} text='Paste the invoice string (starts with "fibt..." on testnet) into the input field.' />
              <Step n={4} text='Click "Send payment". This calls the send_payment RPC.' />
              <Step n={5} text="The JSON result in the right panel confirms the payment or shows an error (e.g. no route found)." />
            </div>
            <Callout kind="warn">
              If you see <em>no route found</em>, either you have no open channels or no path
              exists between you and the recipient. Try connecting to a public relay and opening
              a channel first.
            </Callout>
          </section>

          {/* ── Open channel ── */}
          <section id="open-channel" className="hiw-section">
            <h2 className="hiw-h2">Opening a channel</h2>
            <p>
              A <strong>payment channel</strong> locks CKB on-chain between you and a peer.
              Once open, you can send and receive payments through it instantly—at near-zero cost—
              without waiting for on-chain confirmations.
            </p>
            <div className="hiw-steps">
              <Step n={1} text="Connect to a peer first (Network tab → Connect relay 1 or 2)." />
              <Step n={2} text='Under "Channels & payments", find the "Open channel" block.' />
              <Step n={3} text='Enter the funding amount in hex. 0xb9e459300 ≈ 499 CKB is shown in the docs as a working example. This is the amount you lock into the channel.' />
              <Step n={4} text='Click "Open channel". This calls open_channel with the relay&apos;s public key, the amount, and public: true.' />
              <Step n={5} text='The result panel shows the channel_id. Copy it—you will need it to close the channel later.' />
              <Step n={6} text='Click "My channels" to confirm the new channel appears with status "open".' />
            </div>
            <div className="hiw-snippet">
              <div className="hiw-snippet-bar">Example open_channel parameters</div>
              <pre className="hiw-snippet-body">{`{
  "pubkey": "<relay public key>",
  "funding_amount": "0xb9e459300",
  "public": true
}`}</pre>
            </div>
            <Callout kind="info">
              Opening a channel requires an on-chain CKB transaction. It will not appear in the
              channel list until the transaction is confirmed on CKB (usually a few minutes on
              testnet).
            </Callout>
          </section>

          {/* ── Logs ── */}
          <section id="logs" className="hiw-section">
            <h2 className="hiw-h2">Logs &amp; troubleshooting</h2>
            <p>
              The <Pill>Node</Pill> tab streams the last 200 lines of <Code>fnn</Code> output in
              real time. This is the first place to look when something is not working.
            </p>
            <div className="hiw-trouble-grid">
              <div className="hiw-trouble-item">
                <h3>Node will not start</h3>
                <p>
                  Check that your key file exists at{" "}
                  <Code>{"{data dir}/ckb/key"}</Code> and that the keychain password you saved
                  matches the one used to encrypt it. A missing key produces a clear error in the log.
                </p>
              </div>
              <div className="hiw-trouble-item">
                <h3>Port conflict</h3>
                <p>
                  <Code>fnn</Code> defaults to port <Code>8227</Code> for its RPC. If another
                  process uses that port, the node will crash immediately. Update the port in{" "}
                  <Code>config.yml</Code> and in <Pill>Setup</Pill> → Node API.
                </p>
              </div>
              <div className="hiw-trouble-item">
                <h3>macOS keychain prompts</h3>
                <p>
                  The first time Fiber Desktop reads the stored password, macOS may ask for your
                  login password. Choose <strong>Always Allow</strong> so the prompt does not
                  reappear every time you start the node.
                </p>
              </div>
              <div className="hiw-trouble-item">
                <h3>No route found on payment</h3>
                <p>
                  You need an open, funded channel with a path to the recipient. Connect to a
                  public relay and open a channel first, then retry.
                </p>
              </div>
              <div className="hiw-trouble-item">
                <h3>fnn binary missing</h3>
                <p>
                  Go to <Pill>Setup</Pill> → Included node &amp; updates and click{" "}
                  <strong>Use app-included node</strong> or <strong>Download</strong> to restore
                  the sidecar binary.
                </p>
              </div>
              <div className="hiw-trouble-item">
                <h3>Getting more help</h3>
                <p>
                  Read the{" "}
                  <a href="https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md" target="_blank" rel="noreferrer">
                    Fiber testnet nodes guide
                  </a>{" "}
                  or open an issue on the{" "}
                  <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
                    Fiber Desktop repo
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* ── End CTA ── */}
          <div className="hiw-end-cta">
            <h2>Ready to try it?</h2>
            <p>Download Fiber Desktop and run the guided setup — it takes about five minutes.</p>
            <div className="landing-cta-row">
              <a className="landing-cta-primary" href={releasesUrl} target="_blank" rel="noreferrer">
                <span className="landing-cta-label">Download Fiber Desktop</span>
                <span className="landing-cta-meta">macOS &amp; Windows · free</span>
              </a>
              <a className="landing-cta-secondary" href="/index.html">
                Back to home
              </a>
            </div>
          </div>

        </article>
      </div>

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
