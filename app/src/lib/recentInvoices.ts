export type InvoiceDisplayStatus = "Pending" | "Paid" | "Expired" | "Cancelled";

export type RecentInvoice = {
  id: string;
  paymentHash: string;
  invoiceString: string;
  amountCkb: string;
  description: string;
  status: InvoiceDisplayStatus;
  createdAt: number;
};

const STORAGE_KEY = "fiber-desktop-recent-invoices";
const MAX_INVOICES = 30;

export function loadRecentInvoices(): RecentInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentInvoice).slice(0, MAX_INVOICES);
  } catch {
    return [];
  }
}

export function saveRecentInvoices(invoices: RecentInvoice[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(invoices.slice(0, MAX_INVOICES))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function prependRecentInvoice(
  invoices: RecentInvoice[],
  entry: Omit<RecentInvoice, "id" | "createdAt"> & {
    id?: string;
    createdAt?: number;
  }
): RecentInvoice[] {
  const next: RecentInvoice = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: entry.createdAt ?? Date.now(),
    paymentHash: entry.paymentHash,
    invoiceString: entry.invoiceString,
    amountCkb: entry.amountCkb,
    description: entry.description,
    status: entry.status,
  };
  const withoutDup = invoices.filter(
    (i) => i.paymentHash !== next.paymentHash && i.invoiceString !== next.invoiceString
  );
  return [next, ...withoutDup].slice(0, MAX_INVOICES);
}

export function isInvoiceStatusTerminal(status: InvoiceDisplayStatus): boolean {
  return status !== "Pending";
}

function isRecentInvoice(v: unknown): v is RecentInvoice {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.paymentHash === "string" &&
    typeof o.invoiceString === "string" &&
    typeof o.amountCkb === "string" &&
    typeof o.description === "string" &&
    typeof o.createdAt === "number" &&
    (o.status === "Pending" ||
      o.status === "Paid" ||
      o.status === "Expired" ||
      o.status === "Cancelled")
  );
}
