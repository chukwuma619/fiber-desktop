import { HELP_GUIDES } from "../constants/helpLinks";

type HelpLinksPanelProps = {
  compact?: boolean;
};

export function HelpLinksPanel({ compact = false }: HelpLinksPanelProps) {
  const links = [
    { href: HELP_GUIDES.setup, label: "Setup guide", desc: "Network, key, and first start" },
    { href: HELP_GUIDES.receive, label: "Receive guide", desc: "Create and share invoices" },
    { href: HELP_GUIDES.send, label: "Send guide", desc: "Pay invoices safely" },
    { href: HELP_GUIDES.index, label: "All guides", desc: "Full walkthrough index" },
  ] as const;

  return (
    <section className={`panel${compact ? " panel-compact-help" : ""}`}>
      <h2 className="panel-title">Help & guides</h2>
      {!compact ? (
        <p className="panel-lead panel-lead-tight">
          Step-by-step docs for setup, channels, and payments.
        </p>
      ) : null}
      <ul className="help-links-list" role="list">
        {links.map((link) => (
          <li key={link.href}>
            <a
              className="help-link-card"
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="help-link-card-title">{link.label}</span>
              <span className="help-link-card-desc">{link.desc}</span>
              <span className="help-link-card-arrow" aria-hidden>
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
