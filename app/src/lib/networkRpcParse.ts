/** Best-effort parsing of Fiber JSON-RPC `result` objects (API may evolve). */

import type { InvoiceDisplayStatus } from "./recentInvoices";

export type ParsedNodeSummary = {
  version: string;
  pubkey: string;
  pubkeyDisplay: string;
  channelCount: string;
  pendingChannelCount: string;
  peersCount: string;
  addresses: string[];
  /** From default_funding_lock_script.args — used for close_script in shutdown_channel. */
  lockArg: string;
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
  isUdt: boolean;
};

export type ParsedGraphNodeRow = {
  pubkey: string;
  pubkeyDisplay: string;
  nodeName: string;
  version: string;
  addressCount: number;
  addresses: string[];
  primaryAddress: string | null;
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

export function isChannelReady(stateLabel: string): boolean {
  const u = stateLabel.toUpperCase();
  return u.includes("READY") && !u.includes("NOT");
}

export function formatChannelStateForDisplay(stateLabel: string): string {
  const u = stateLabel.toUpperCase();
  if (isChannelReady(stateLabel)) return "Ready";
  if (u.includes("NEGOTIAT") || u.includes("PENDING") || u.includes("AWAIT")) {
    return "Opening";
  }
  if (u.includes("SHUTDOWN") || u.includes("CLOS")) return "Closing";
  if (u.includes("DISABLE")) return "Disabled";
  const stripped = stateLabel.replace(/^CHANNEL_/i, "");
  if (!stripped || stripped === stateLabel) {
    return stateLabel.length > 24 ? truncateMiddle(stateLabel, 8, 6) : stateLabel;
  }
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

export function channelStateBadgeClass(stateLabel: string): string {
  if (isChannelReady(stateLabel)) return "network-badge";
  const u = stateLabel.toUpperCase();
  if (
    u.includes("NEGOTIAT") ||
    u.includes("PENDING") ||
    u.includes("AWAIT") ||
    u.includes("OPEN")
  ) {
    return "network-badge network-badge-warn";
  }
  if (u.includes("SHUTDOWN") || u.includes("CLOS") || u.includes("DISABLE")) {
    return "network-badge network-badge-muted";
  }
  return "network-badge network-badge-muted";
}

export function findOpeningChannel(
  channels: ParsedChannelRow[],
  tempId: string | null,
  peerPubkey: string
): ParsedChannelRow | undefined {
  const peer = peerPubkey.trim().toLowerCase();
  if (tempId) {
    const byId = channels.find((c) => c.channelId === tempId);
    if (byId) return byId;
  }
  if (!peer) return undefined;
  return channels.find(
    (c) =>
      c.peerPubkey.toLowerCase() === peer && !isChannelReady(c.stateLabel)
  );
}

export function summarizeChannelState(state: unknown): string {
  if (isRecord(state)) {
    // Fiber v0.8+: { state_name: "CHANNEL_READY", state_flags: [] }
    if (typeof state.state_name === "string") {
      return state.state_name;
    }
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

  // Extract lock arg from default_funding_lock_script (v0.8+)
  const fundingLock = isRecord(result.default_funding_lock_script)
    ? result.default_funding_lock_script
    : null;
  const lockArg = fundingLock ? (pickStr(fundingLock.args) ?? "") : "";

  return {
    version: pickStr(result.version) ?? "—",
    pubkey,
    pubkeyDisplay: pubkey ? truncateMiddle(pubkey) : "—",
    channelCount: formatMaybeHexInt(result.channel_count),
    pendingChannelCount: formatMaybeHexInt(result.pending_channel_count),
    peersCount: formatMaybeHexInt(result.peers_count),
    addresses,
    lockArg,
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
    // API field is peer_pubkey (v0.8+); fall back to pubkey for older responses
    const peer = pickStr(item.peer_pubkey) ?? pickStr(item.pubkey) ?? "";
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
      isUdt: item.funding_udt_type_script != null,
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
    const addresses: string[] = [];
    if (Array.isArray(item.addresses)) {
      for (const a of item.addresses) {
        if (typeof a === "string" && a.length > 0) {
          addresses.push(a);
        }
      }
    }
    rows.push({
      pubkey,
      pubkeyDisplay: pubkey ? truncateMiddle(pubkey) : "—",
      nodeName: pickStr(item.node_name) ?? "—",
      version: pickStr(item.version) ?? "—",
      addressCount: addresses.length,
      addresses,
      primaryAddress: addresses[0] ?? null,
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

export function summarizeInvoiceStatus(status: unknown): string {
  if (typeof status === "string") {
    return status;
  }
  if (isRecord(status)) {
    const keys = Object.keys(status);
    if (keys.length === 1) {
      return keys[0] ?? "";
    }
  }
  return "";
}

export function invoiceStatusToDisplay(raw: string): InvoiceDisplayStatus {
  const u = raw.trim().toLowerCase();
  if (u === "paid") return "Paid";
  if (u === "expired") return "Expired";
  if (u === "cancelled" || u === "canceled") return "Cancelled";
  return "Pending";
}

export function invoiceStatusBadgeClass(
  status: InvoiceDisplayStatus
): string {
  switch (status) {
    case "Paid":
      return "network-badge";
    case "Pending":
      return "network-badge network-badge-warn";
    case "Expired":
    case "Cancelled":
      return "network-badge network-badge-muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function parseNewInvoiceResult(result: unknown): {
  invoiceAddress: string | null;
  paymentHash: string | null;
} {
  const invoiceAddress = pickInvoiceAddress(result);
  let paymentHash: string | null = null;
  if (!isRecord(result)) {
    return { invoiceAddress, paymentHash };
  }
  if (typeof result.payment_hash === "string") {
    paymentHash = result.payment_hash;
  }
  const inv = result.invoice;
  if (isRecord(inv)) {
    if (typeof inv.payment_hash === "string") {
      paymentHash = inv.payment_hash;
    }
    const data = inv.data;
    if (isRecord(data) && typeof data.payment_hash === "string") {
      paymentHash = data.payment_hash;
    }
  }
  return { invoiceAddress, paymentHash };
}

export function parseGetInvoiceStatus(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }
  const raw = summarizeInvoiceStatus(result.status);
  return raw || null;
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
    case "open_channel": {
      if (isRecord(result) && typeof result.temporary_channel_id === "string") {
        return `Temp ID: ${truncateMiddle(result.temporary_channel_id, 10, 8)}`;
      }
      return "Open channel requested";
    }
    case "new_invoice": {
      const inv = pickInvoiceAddress(result);
      return inv ? `Invoice ${truncateMiddle(inv, 12, 10)}` : "Invoice created";
    }
    case "send_payment": {
      if (isRecord(result)) {
        const hash = typeof result.payment_hash === "string" ? result.payment_hash : null;
        const status = typeof result.status === "string" ? result.status : null;
        if (hash && status) return `${status} · ${truncateMiddle(hash, 8, 6)}`;
      }
      return "Payment RPC returned";
    }
    case "get_payment": {
      if (isRecord(result)) {
        const status = typeof result.status === "string" ? result.status : null;
        if (status) return `Status: ${status}`;
      }
      return "Payment info received";
    }
    case "shutdown_channel":
      return "Channel shutdown requested";
    default:
      return "OK";
  }
}
