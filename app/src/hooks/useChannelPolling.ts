import { useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export type UseChannelPollingOptions = {
  /** When true, polls on an interval until inactive or timeout. */
  active: boolean;
  onPoll: () => void;
  intervalMs?: number;
  timeoutMs?: number;
};

export function useChannelPolling({
  active,
  onPoll,
  intervalMs = DEFAULT_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseChannelPollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!active) {
      setIsPolling(false);
      setTimedOut(false);
      return;
    }

    setTimedOut(false);
    setIsPolling(true);
    const startedAt = Date.now();

    const tick = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        setTimedOut(true);
        setIsPolling(false);
        return false;
      }
      onPollRef.current();
      return true;
    };

    tick();
    const id = window.setInterval(() => {
      if (!tick()) {
        window.clearInterval(id);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      setIsPolling(false);
    };
  }, [active, intervalMs, timeoutMs]);

  return { isPolling, timedOut };
}
