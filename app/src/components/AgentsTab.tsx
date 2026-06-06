import { useMemo, useState } from "react";
import { useShopAgents } from "../hooks/useShopAgents";
import { truncateMiddle } from "../lib/networkRpcParse";
import type { NodePresenceKind } from "../lib/nodePresence";
import {
  emptyAgentForm,
  type ShopAgentConfig,
  type ShopAgentRow,
} from "../types/shopAgents";
import { NodeUnreachableBanner } from "./NodeUnreachableBanner";

export type AgentsTabProps = {
  rpcReachable: boolean;
  nodePresence: NodePresenceKind;
  onGoToNode?: () => void;
};

function formatPollTime(raw: string | null): string {
  if (!raw) return "—";
  const secs = Number(raw);
  if (!Number.isFinite(secs) || secs <= 0) return raw;
  return new Date(secs * 1000).toLocaleTimeString();
}

export function AgentsTab({
  rpcReachable,
  nodePresence,
  onGoToNode,
}: AgentsTabProps) {
  const { agents, busy, error, setError, save, remove, setEnabled } =
    useShopAgents(true);
  const [form, setForm] = useState<ShopAgentConfig>(() => emptyAgentForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const runningCount = useMemo(
    () => agents.filter((a) => a.status.running).length,
    [agents],
  );

  const resetForm = () => {
    setForm(emptyAgentForm());
    setEditingId(null);
  };

  const startEdit = (row: ShopAgentRow) => {
    setEditingId(row.config.id);
    setForm({ ...row.config });
    setError(null);
  };

  const handleSubmit = async () => {
    const saved = await save(form);
    if (saved) resetForm();
  };

  const rpcBlocked = !rpcReachable;

  return (
    <div className="pmt-layout">
      <NodeUnreachableBanner
        nodePresence={nodePresence}
        rpcReachable={rpcReachable}
        onGoToNode={onGoToNode}
      />

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Shop agents</h2>
            <p className="pmt-step-desc">
              Connect one or more websites. Each agent polls your shop API for
              orders and creates Fiber invoices on this node automatically.
            </p>
          </div>
        </div>
        <div className="pmt-step-body">
          <div className="pmt-status-bar">
            <div className="pmt-status-stats">
              <div className="pmt-stat">
                <span className="pmt-stat-k">Configured</span>
                <span className="pmt-stat-v">{agents.length}</span>
              </div>
              <div className="pmt-stat">
                <span className="pmt-stat-k">Polling</span>
                <span className="pmt-stat-v">{runningCount}</span>
              </div>
            </div>
          </div>
          <p className="field-hint">
            Keep Fiber Desktop running with your node online. Each agent talks{" "}
            <strong>outbound</strong> to your website — no Fiber VPS required.
          </p>
        </div>
      </section>

      {error && (
        <div className="network-inline-error" role="alert">
          <strong className="network-inline-error-title">Agent error</strong>
          <p className="network-inline-error-body">{error}</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: "0.35rem" }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">
              {editingId ? "Edit agent" : "Add agent"}
            </h2>
            <p className="pmt-step-desc">
              Point at a shop backend that exposes invoice jobs for your merchant
              ID.
            </p>
          </div>
        </div>
        <div className="pmt-step-body">
          <div className="field">
            <label className="field-label" htmlFor="agent-name">
              Name
            </label>
            <input
              id="agent-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="My Vercel store"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="agent-api-url">
              Shop API URL
            </label>
            <input
              id="agent-api-url"
              className="input input-mono"
              value={form.apiBaseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiBaseUrl: e.target.value }))
              }
              placeholder="https://my-shop.vercel.app"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="agent-merchant-id">
              Merchant ID
            </label>
            <input
              id="agent-merchant-id"
              className="input input-mono"
              value={form.merchantId}
              onChange={(e) =>
                setForm((f) => ({ ...f, merchantId: e.target.value }))
              }
              placeholder="merchant_abc"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="agent-token">
              API token
            </label>
            <input
              id="agent-token"
              className="input input-mono"
              type="password"
              value={form.apiToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiToken: e.target.value }))
              }
              placeholder="Bearer token from shop pairing"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <details className="agents-advanced">
            <summary className="field-label">Advanced paths & timing</summary>
            <div className="agents-advanced-body">
              <div className="field">
                <label className="field-label" htmlFor="agent-poll-path">
                  Poll jobs path
                </label>
                <input
                  id="agent-poll-path"
                  className="input input-mono"
                  value={form.pollJobsPath}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pollJobsPath: e.target.value }))
                  }
                  spellCheck={false}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="agent-submit-path">
                  Submit invoice path
                </label>
                <input
                  id="agent-submit-path"
                  className="input input-mono"
                  value={form.submitInvoicePath}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      submitInvoicePath: e.target.value,
                    }))
                  }
                  spellCheck={false}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="agent-interval">
                  Poll interval (seconds)
                </label>
                <input
                  id="agent-interval"
                  className="input"
                  inputMode="numeric"
                  value={String(form.pollIntervalSecs)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setForm((f) => ({
                      ...f,
                      pollIntervalSecs: Number.isFinite(n) ? n : 5,
                    }));
                  }}
                />
              </div>
            </div>
          </details>
          <div className="agents-form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || rpcBlocked}
              onClick={() => void handleSubmit()}
            >
              {busy
                ? "Saving…"
                : editingId
                  ? "Save & start polling"
                  : "Add & start polling"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
          {rpcBlocked && (
            <p className="field-hint">
              Start your node before adding agents — invoices are created locally.
            </p>
          )}
        </div>
      </section>

      <section className="pmt-step panel">
        <div className="pmt-step-head">
          <div className="pmt-step-info">
            <h2 className="pmt-step-title">Your agents</h2>
          </div>
        </div>
        <div className="pmt-step-body">
          {agents.length === 0 ? (
            <p className="pmt-status-empty">No agents yet. Add one above.</p>
          ) : (
            <ul className="agents-list">
              {agents.map((row) => (
                <li key={row.config.id} className="agents-card">
                  <div className="agents-card-head">
                    <div>
                      <div className="agents-card-title">{row.config.name}</div>
                      <div className="agents-card-sub input-mono">
                        {row.config.apiBaseUrl}
                      </div>
                    </div>
                    <span
                      className={`network-badge${row.status.running ? "" : " network-badge-muted"}`}
                    >
                      {row.status.running ? "Polling" : "Stopped"}
                    </span>
                  </div>
                  <dl className="agents-card-meta">
                    <div>
                      <dt>Merchant</dt>
                      <dd className="code-pill">{row.config.merchantId}</dd>
                    </div>
                    <div>
                      <dt>Last poll</dt>
                      <dd>{formatPollTime(row.status.lastPollAt)}</dd>
                    </div>
                    <div>
                      <dt>Jobs done</dt>
                      <dd>{row.status.jobsProcessed}</dd>
                    </div>
                    {row.status.lastOrderId && (
                      <div>
                        <dt>Last order</dt>
                        <dd>{row.status.lastOrderId}</dd>
                      </div>
                    )}
                  </dl>
                  {row.status.lastError && (
                    <p className="agents-card-error" role="status">
                      {row.status.lastError}
                    </p>
                  )}
                  {row.status.lastInvoiceAddress && (
                    <p className="field-hint">
                      Last invoice:{" "}
                      <code className="code-pill">
                        {truncateMiddle(row.status.lastInvoiceAddress, 14, 10)}
                      </code>
                    </p>
                  )}
                  <div className="agents-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() =>
                        void setEnabled(row.config.id, !row.config.enabled)
                      }
                    >
                      {row.config.enabled ? "Stop" : "Start"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove agent "${row.config.name}"?`,
                          )
                        ) {
                          void remove(row.config.id);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
