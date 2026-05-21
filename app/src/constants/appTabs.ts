export const APP_TABS = [
  {
    id: "overview" as const,
    label: "Overview",
    hint: "See status and get started",
  },
  {
    id: "setup" as const,
    label: "Setup",
    hint: "Network, folders, and security",
  },
  { id: "node" as const, label: "Node", hint: "Start, stop, and logs" },
  {
    id: "payments" as const,
    label: "Channels",
    hint: "Open, manage, and close channels",
  },
  {
    id: "receive" as const,
    label: "Receive",
    hint: "Generate an invoice to get paid",
  },
  {
    id: "send" as const,
    label: "Send",
    hint: "Pay an invoice from another node",
  },
  {
    id: "network" as const,
    label: "Network",
    hint: "Node info and channel status",
  },
];

export type TabId = (typeof APP_TABS)[number]["id"];
