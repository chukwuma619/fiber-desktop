import { useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL_MS = 5000;

export type UseInvoiceStatusPollingOptions = {
  active: boolean;
  onPoll: () => void;
  intervalMs?: number;
};

/** Poll invoice status while any recent invoice is still pending. */
export function useInvoiceStatusPolling({
  active,
  onPoll,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseInvoiceStatusPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!active) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    onPollRef.current();
    const id = window.setInterval(() => onPollRef.current(), intervalMs);
    return () => {
      window.clearInterval(id);
      setIsPolling(false);
    };
  }, [active, intervalMs]);

  return { isPolling };
}
