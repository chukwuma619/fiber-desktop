export type ShopAgentConfig = {
  id: string;
  name: string;
  apiBaseUrl: string;
  merchantId: string;
  apiToken: string;
  pollJobsPath: string;
  submitInvoicePath: string;
  pollIntervalSecs: number;
  enabled: boolean;
};

export type ShopAgentStatus = {
  id: string;
  running: boolean;
  lastPollAt: string | null;
  lastError: string | null;
  jobsProcessed: number;
  lastOrderId: string | null;
  lastInvoiceAddress: string | null;
};

export type ShopAgentRow = {
  config: ShopAgentConfig;
  status: ShopAgentStatus;
};

export const DEFAULT_POLL_JOBS_PATH = "/api/merchant/jobs";
export const DEFAULT_SUBMIT_INVOICE_PATH = "/api/merchant/invoices";
export const DEFAULT_POLL_INTERVAL_SECS = 5;

export function emptyAgentForm(): ShopAgentConfig {
  return {
    id: "",
    name: "",
    apiBaseUrl: "",
    merchantId: "",
    apiToken: "",
    pollJobsPath: DEFAULT_POLL_JOBS_PATH,
    submitInvoicePath: DEFAULT_SUBMIT_INVOICE_PATH,
    pollIntervalSecs: DEFAULT_POLL_INTERVAL_SECS,
    enabled: true,
  };
}
