import { FIBER_DESKTOP_REPO_URL } from "../../constants/marketing";
import { GuideChrome } from "./GuideChrome";
import { Callout, Code, Pill } from "./guidePrimitives";

export function AboutProjectPage() {
  return (
    <GuideChrome
      heroEyebrow="About"
      heroTitle="About Fiber Desktop"
      heroSub="A native desktop shell around the official Fiber node (fnn) so you can run payment channels on Nervos CKB without living in a terminal."
    >
      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">What this app does</h2>
        <p>
          <strong>Fiber Desktop</strong> is an open-source app for <strong>macOS</strong> and{" "}
          <strong>Windows</strong> that runs the Fiber Network node binary (<Code>fnn</Code>) on
          your machine.           It provides tabs for setup, starting and stopping the node, logs, network status,
          and dedicated <Pill>Channels</Pill>, <Pill>Send</Pill>, and <Pill>Receive</Pill> tabs for
          opening channels, paying invoices, and generating invoices.
        </p>
        <p>
          The <strong>Fiber Network</strong> is a payment-channel layer on{" "}
          <strong>Nervos CKB</strong>: payments can move off-chain between peers and only settle
          on-chain when you open or close channels (similar in spirit to Lightning-style networks).
        </p>
        <Callout kind="info">
          Fiber Desktop is <strong>not</strong> a hosted wallet service. The node runs locally;
          you hold your CKB key file and your keychain password. Back up your key safely.
        </Callout>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">Open source</h2>
        <p>
          Source code and releases live on GitHub:{" "}
          <a href={FIBER_DESKTOP_REPO_URL} target="_blank" rel="noreferrer">
            {FIBER_DESKTOP_REPO_URL}
          </a>
          . The underlying protocol and <Code>fnn</Code> implementation live in the{" "}
          <a href="https://github.com/nervosnetwork/fiber" target="_blank" rel="noreferrer">
            nervosnetwork/fiber
          </a>{" "}
          repository.
        </p>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">Documentation</h2>
        <p>
          Official Fiber documentation is at{" "}
          <a href="https://docs.fiber.world/" target="_blank" rel="noreferrer">
            docs.fiber.world
          </a>
          . These guides focus on what you see inside Fiber Desktop.
        </p>
      </section>

      <p className="hiw-back-link">
        <a href="/how-it-works">← All guides</a>
      </p>
    </GuideChrome>
  );
}
