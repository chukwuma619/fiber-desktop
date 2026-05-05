/** Documented public relay pubkeys — Fiber fnn v0.8+ (see public-nodes.md). */
export const PUBLIC_NODE_PUBKEYS = {
  mainnet: {
    node1: "03a8d7da8d0934363dbc17f52c872e8d833016415266eabb3527439c5dd17adc6b",
    node2: "033a69e5be369dab43aefa96fa729d83c571ccb066f312136c6ab2d354fcc028f9",
  },
  testnet: {
    node1: "02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71",
    node2: "0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc",
  },
} as const;

export type NetworkId = keyof typeof PUBLIC_NODE_PUBKEYS;
