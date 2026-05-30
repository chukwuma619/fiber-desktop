export type ActivityKind =
  | "invoice_created"
  | "invoice_paid"
  | "payment_sent"
  | "channel_opened"
  | "channel_closed";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  at: number;
  title: string;
  detail?: string;
  amountCkb?: string;
};

const STORAGE_KEY = "fiber-desktop-activity";
const MAX_ENTRIES = 80;

export function loadActivityHistory(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isActivityEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveActivityHistory(entries: ActivityEntry[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function recordActivity(
  entry: Omit<ActivityEntry, "id" | "at"> & { id?: string; at?: number },
): ActivityEntry[] {
  const next: ActivityEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: entry.at ?? Date.now(),
    kind: entry.kind,
    title: entry.title,
    detail: entry.detail,
    amountCkb: entry.amountCkb,
  };
  const merged = [next, ...loadActivityHistory()].slice(0, MAX_ENTRIES);
  saveActivityHistory(merged);
  return merged;
}

export function clearActivityHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function activityKindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "invoice_created":
      return "Invoice created";
    case "invoice_paid":
      return "Invoice paid";
    case "payment_sent":
      return "Payment sent";
    case "channel_opened":
      return "Channel opened";
    case "channel_closed":
      return "Channel closed";
  }
}

function isActivityEntry(v: unknown): v is ActivityEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.at === "number" &&
    typeof o.title === "string" &&
    (o.kind === "invoice_created" ||
      o.kind === "invoice_paid" ||
      o.kind === "payment_sent" ||
      o.kind === "channel_opened" ||
      o.kind === "channel_closed")
  );
}
