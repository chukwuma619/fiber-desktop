/** Documented public relay nodes — Fiber fnn v0.8+ (see public-nodes.md). */
export const PUBLIC_NODES = {
  mainnet: {
    node1: {
      pubkey: "03a8d7da8d0934363dbc17f52c872e8d833016415266eabb3527439c5dd17adc6b",
      address: "",
    },
    node2: {
      pubkey: "033a69e5be369dab43aefa96fa729d83c571ccb066f312136c6ab2d354fcc028f9",
      address: "",
    },
  },
  testnet: {
    node1: {
      pubkey: "02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71",
      address:
        "/ip4/18.162.235.225/tcp/8119/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo",
    },
    node2: {
      pubkey: "0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc",
      address:
        "/ip4/18.163.221.211/tcp/8119/p2p/QmbKyzq9qUmymW2Gi8Zq7kKVpPiNA1XUJ6uMvsUC4F3p89",
    },
  },
} as const;

export type NetworkId = keyof typeof PUBLIC_NODES;

/** Backward-compat export: just the pubkeys (used by NetworkTab). */
export const PUBLIC_NODE_PUBKEYS = {
  mainnet: {
    node1: PUBLIC_NODES.mainnet.node1.pubkey,
    node2: PUBLIC_NODES.mainnet.node2.pubkey,
  },
  testnet: {
    node1: PUBLIC_NODES.testnet.node1.pubkey,
    node2: PUBLIC_NODES.testnet.node2.pubkey,
  },
} as const;
