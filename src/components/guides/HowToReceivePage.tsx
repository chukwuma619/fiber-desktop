import { GuideChrome } from "./GuideChrome";
import { Callout, Code, Step } from "./guidePrimitives";

export function HowToReceivePage() {
  return (
    <GuideChrome
      activeNav="receive"
      heroEyebrow="Guide"
      heroTitle="How to receive a payment"
      heroSub="You are the payee: you create an invoice in Fiber Desktop and send the invoice string to the payer through any channel you already use (chat, email, etc.)."
    >
      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">What “channel ready” means for you</h2>
        <p>
          You need at least one channel that is <strong>open on-chain</strong> and shown as ready in
          the app so the network can route to you. In <strong>Payments</strong> →{" "}
          <strong>My Channels</strong>, refresh until the state reads{" "}
          <Code>CHANNEL_READY</Code> or <Code>ChannelReady</Code> (not stuck in negotiating or
          awaiting signatures).
        </p>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">Receiver checklist (step by step)</h2>
        <div className="hiw-steps">
          <Step
            n={1}
            text="Install Fiber Desktop and finish Setup (same as any user: key file, password, network choice)."
          />
          <Step
            n={2}
            text="Fund your CKB wallet on the correct network so you can cover fees and lock capacity when opening channels."
          />
          <Step
            n={3}
            text="Start your node and keep it running."
          />
          <Step
            n={4}
            text="Open Payments → step 1a — connect to a public relay or a trusted peer so your node is visible on the P2P network."
          />
          <Step
            n={5}
            text="Open Payments → step 1b — open a channel with enough funding toward that peer. On public testnet relays, follow the minimum amounts in the official Fiber guides."
          />
          <Step
            n={6}
            text="Open Payments → step 2 — Refresh Channels until the channel shows CHANNEL_READY / ChannelReady."
          />
          <Step
            n={7}
            text="Open Payments → step 3 — set the invoice amount (hex shannons; presets like 1 CKB are available), optional description, then Create Invoice."
          />
          <Step
            n={8}
            text="Copy the full invoice string from the app and send it to the payer by Signal, email, or any messenger. They will paste it into Payments → step 4 on their machine."
          />
          <Step
            n={9}
            text="After they pay, open Payments → step 2 and Refresh Channels. Your local and remote balances should reflect the payment once it has cleared off-chain."
          />
        </div>
        <Callout kind="info">
          The invoice encodes who should be paid and how much. Anyone with the string could pay
          it; treat it like a payment link and only share it with the intended payer.
        </Callout>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">Related official walkthroughs</h2>
        <p>
          For CKB and stablecoin flows on the command line or RPC, see{" "}
          <a
            href="https://www.fiber.world/docs/quick-start/basic-transfer"
            target="_blank"
            rel="noreferrer"
          >
            Basic transfer
          </a>{" "}
          and{" "}
          <a
            href="https://www.fiber.world/docs/quick-start/transfer-stablecoin"
            target="_blank"
            rel="noreferrer"
          >
            Transfer stablecoins
          </a>{" "}
          on fiber.world.
        </p>
      </section>

      <p className="hiw-back-link">
        <a href="/how-it-works.html">← All guides</a>
        {" · "}
        <a href="/how-to-send.html">How to send</a>
      </p>
    </GuideChrome>
  );
}
