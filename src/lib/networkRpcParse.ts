/** Best-effort parsing of Fiber JSON-RPC `result` objects (API may evolve). */

export type ParsedNodeSummary = {
  version: string;
  pubkey: string;
  pubkeyDisplay: string;
  channelCount: string;
  pendingChannelCount: string;
  peersCount: string;
  addresses: string[];
};

export type ParsedChannelRow = {
  channelId: string;
  channelIdDisplay: string;
  peerPubkey: string;
  peerDisplay: string;
  stateLabel: string;
  localBalance: string;
  remoteBalance: string;
  isPublic: boolean;
  enabled: boolean;
};

export type ParsedGraphNodeRow = {
  pubkey: string;
  pubkeyDisplay: string;
  nodeName: string;
  version: string;
  addressCount: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Fiber often serializes small integers as hex strings (usually `0x` prefixed). */
export function formatMaybeHexInt(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(Math.trunc(v));
  }
  if (typeof v !== "string") {
    return "—";
  }
  const t = v.trim();
  if (!t) {
    return "—";
  }
  const has0x = t.startsWith("0x") || t.startsWith("0X");
  try {
    if (has0x) {
      return BigInt(t).toString(10);
    }
    if (/[a-fA-F]/.test(t)) {
      return BigInt(`0x${t}`).toString(10);
    }
    return BigInt(t).toString(10);
  } catch {
    return t;
  }
}

export function truncateMiddle(s: string, head = 8, tail = 6): string {
  if (s.length <= head + tail + 1) {
    return s;
  }
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** u128 / hex balance → human CKB line (shannons / 10^8). */
export function formatShannonsLike(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    return formatFromBigInt(BigInt(Math.trunc(v)));
  }
  if (typeof v !== "string") {
    return "—";
  }
  const t = v.trim();
  if (!t) {
    return "—";
  }
  try {
    const n = BigInt(t.startsWith("0x") || t.startsWith("0X") ? t : `0x${t}`);
    return formatFromBigInt(n);
  } catch {
    return t;
  }
}

function formatFromBigInt(shannons: bigint): string {
  const base = 100_000_000n;
  const whole = shannons / base;
  const frac = shannons % base;
  if (frac === 0n) {
    return `${whole.toString()} CKB`;
  }
  const fracStr = frac.toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr} CKB`;
}

export function summarizeChannelState(state: unknown): string {
  if (isRecord(state)) {
    const keys = Object.keys(state);
    if (keys.length === 1) {
      return keys[0] ?? JSON.stringify(state);
    }
    return JSON.stringify(state);
  }
  if (typeof state === "string") {
    return state;
  }
  try {
    return JSON.stringify(state);
  } catch {
    return String(state);
  }
}

export function parseNodeInfo(result: unknown): ParsedNodeSummary | null {
  if (!isRecord(result)) {
    return null;
  }
  const pubkey = pickStr(result.pubkey) ?? "";
  const addresses = Array.isArray(result.addresses)
    ? result.addresses.filter((x): x is string => typeof x === "string")
    : [];
  return {
    version: pickStr(result.version) ?? "—",
    pubkey,
    pubkeyDisplay: pubkey ? truncateMiddle(pubkey) : "—",
    channelCount: formatMaybeHexInt(result.channel_count),
    pendingChannelCount: formatMaybeHexInt(result.pending_channel_count),
    peersCount: formatMaybeHexInt(result.peers_count),
    addresses,
  };
}

export function parseChannelList(result: unknown): ParsedChannelRow[] {
  if (!isRecord(result)) {
    return [];
  }
  const raw = result.channels;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ParsedChannelRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const channelId = pickStr(item.channel_id) ?? "";
    const peer = pickStr(item.pubkey) ?? "";
    rows.push({
      channelId,
      channelIdDisplay: channelId ? truncateMiddle(channelId, 10, 8) : "—",
      peerPubkey: peer,
      peerDisplay: peer ? truncateMiddle(peer) : "—",
      stateLabel: summarizeChannelState(item.state),
      localBalance: formatShannonsLike(item.local_balance),
      remoteBalance: formatShannonsLike(item.remote_balance),
      isPublic: item.is_public === true,
      enabled: item.enabled !== false,
    });
  }
  return rows;
}

export function parseGraphNodeList(result: unknown): ParsedGraphNodeRow[] {
  if (!isRecord(result)) {
    return [];
  }
  const raw = result.nodes;
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: ParsedGraphNodeRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const pubkey = pickStr(item.pubkey) ?? "";
    const addresses = Array.isArray(item.addresses) ? item.addresses.length : 0;
    rows.push({
      pubkey,
      pubkeyDisplay: pubkey ? truncateMiddle(pubkey) : "—",
      nodeName: pickStr(item.node_name) ?? "—",
      version: pickStr(item.version) ?? "—",
      addressCount: addresses,
    });
  }
  return rows;
}

export function pickInvoiceAddress(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }
  const a = pickStr(result.invoice_address);
  return a && a.length > 0 ? a : null;
}

export function summarizeRpcResult(method: string, result: unknown): string {
  switch (method) {
    case "node_info": {
      const p = parseNodeInfo(result);
      return p
        ? `${p.version} · ${p.channelCount} ch · ${p.peersCount} peers`
        : "Received node info";
    }
    case "list_channels": {
      const n = parseChannelList(result).length;
      return n === 0 ? "No channels" : `${n} channel${n === 1 ? "" : "s"}`;
    }
    case "graph_nodes": {
      const n = parseGraphNodeList(result).length;
      return n === 0 ? "No graph nodes" : `${n} nodes in graph`;
    }
    case "connect_peer":
      return "Connected (or acknowledged)";
    case "open_channel":
      return "Open channel requested";
    case "new_invoice": {
      const inv = pickInvoiceAddress(result);
      return inv ? `Invoice ${truncateMiddle(inv, 12, 10)}` : "Invoice created";
    }
    case "send_payment":
      return "Payment RPC returned";
    default:
      return "OK";
  }
}
