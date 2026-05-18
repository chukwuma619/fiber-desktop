import { GuideChrome } from "./GuideChrome";
import { Callout, Code, Step } from "./guidePrimitives";

export function HowToSendPage() {
  return (
    <GuideChrome
      heroEyebrow="Guide"
      heroTitle="How to send a payment"
      heroSub="You are the payer: you need a running node, a funded channel in the ready state, and an invoice string from the person you are paying."
    >
      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">What “channel ready” means</h2>
        <p>
          After you <strong>open a channel</strong>, your node and CKB must finish funding. Until
          then the channel cannot carry normal routed payments.
        </p>
        <p>
          In the app, open the <strong>Channels</strong> tab and click{" "}
          <strong>Refresh Channels</strong>. The <strong>State</strong> column should show something
          like <Code>CHANNEL_READY</Code> or <Code>ChannelReady</Code>. That means the channel is{" "}
          <strong>open and usable</strong> for payments (you still need enough{" "}
          <strong>local</strong> balance and a route to the payee).
        </p>
        <Callout kind="tip">
          If you just reached ready and paying fails with a routing error, wait a few minutes and
          try again—the network graph can lag behind the channel state. See the{" "}
          <a
            href="https://www.fiber.world/docs/quick-start/connect-nodes"
            target="_blank"
            rel="noreferrer"
          >
            Connect public nodes
          </a>{" "}
          guide on fiber.world.
        </Callout>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">You and the receiver must agree on the network</h2>
        <p>
          Use the <strong>same</strong> Fiber network (e.g. both on <strong>testnet</strong> or both
          on <strong>mainnet</strong>). Geography does not matter; what matters is connectivity,
          liquidity, and matching network choice.
        </p>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">Sender checklist (step by step)</h2>
        <div className="hiw-steps">
          <Step
            n={1}
            text="Install Fiber Desktop and finish Setup (data folder, CKB key file, keychain password). First launch: use Guided setup on the Overview tab if it appears."
          />
          <Step
            n={2}
            text="Fund your CKB wallet on that network (testnet faucet, etc.) so you can pay on-chain fees and lock channel capacity."
          />
          <Step
            n={3}
            text="Start your node from the Overview or Node tab and leave it running."
          />
          <Step
            n={4}
            text="Open the Channels tab → Connect peer — connect to a public relay (Relay 1 / Relay 2) or paste a trusted peer multiaddr / pubkey, then Connect."
          />
          <Step
            n={5}
            text="Open the Channels tab → Open Channel — enter the peer pubkey (filled when you click a relay) and a funding amount in hex shannons (1 CKB = 100,000,000 shannons). Public testnet relays often need about 500 CKB or more—see official docs. Click Open Channel."
          />
          <Step
            n={6}
            text="In the Channels tab, click Refresh Channels until your new channel shows CHANNEL_READY / ChannelReady. If it stays in a negotiating or awaiting-signatures state, wait for CKB confirmations and refresh again."
          />
          <Step
            n={7}
            text="Ask the payee to send you their invoice string (email, chat, etc.). Fiber does not deliver the invoice for you."
          />
          <Step
            n={8}
            text="Open the Send tab — paste the full invoice string → Pay Invoice."
          />
          <Step
            n={9}
            text="Optional: still in the Send tab, use Check Status on the payment hash, and/or open the Channels tab and Refresh Channels to see balances move."
          />
        </div>
        <Callout kind="warn">
          Only pay invoices you trust. There is no undo once a payment is routed.
        </Callout>
      </section>

      <section className="hiw-section hiw-section-tight">
        <h2 className="hiw-h2">If payment fails</h2>
        <p>
          Typical causes: channel not <strong>ready</strong> yet, <strong>no route</strong> to the
          payee, <strong>not enough local balance</strong>, or wrong <strong>network</strong>{" "}
          (testnet vs mainnet). Connect to a relay, ensure a ready channel with capacity, wait a few
          minutes for routing, then retry.
        </p>
      </section>

      <p className="hiw-back-link">
        <a href="/how-it-works">← All guides</a>
        {" · "}
        <a href="/how-to-receive">How to receive</a>
      </p>
    </GuideChrome>
  );
}
