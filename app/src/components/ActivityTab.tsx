import { useCallback, useState } from "react";
import {
  activityKindLabel,
  clearActivityHistory,
  loadActivityHistory,
  type ActivityEntry,
} from "../lib/activityHistory";

export function ActivityTab() {
  const [entries, setEntries] = useState<ActivityEntry[]>(() =>
    loadActivityHistory(),
  );

  const refresh = useCallback(() => {
    setEntries(loadActivityHistory());
  }, []);

  const handleClear = () => {
    clearActivityHistory();
    setEntries([]);
  };

  return (
    <div className="panel-stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Activity history</h2>
            <p className="panel-lead panel-lead-tight">
              Payments, invoices, and channel events from this device.
            </p>
          </div>
          <div className="panel-head-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={refresh}
            >
              Refresh
            </button>
            {entries.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleClear}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {entries.length > 0 ? (
          <ul className="activity-history-list" aria-label="Activity history">
            {entries.map((entry) => (
              <li key={entry.id} className="activity-history-item">
                <span
                  className={`activity-history-kind activity-history-kind-${entry.kind}`}
                >
                  {activityKindLabel(entry.kind)}
                </span>
                <div className="activity-history-main">
                  <span className="activity-history-title">{entry.title}</span>
                  {entry.detail ? (
                    <span className="activity-history-detail">{entry.detail}</span>
                  ) : null}
                  {entry.amountCkb ? (
                    <span className="activity-history-amount">
                      {entry.amountCkb} CKB
                    </span>
                  ) : null}
                </div>
                <time
                  className="activity-history-time"
                  dateTime={new Date(entry.at).toISOString()}
                >
                  {new Date(entry.at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="network-empty-hint">
            No activity yet. Create an invoice, send a payment, or open a channel
            to see events here.
          </p>
        )}
      </section>
    </div>
  );
}
