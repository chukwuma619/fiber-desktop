# Shop agents

Fiber Desktop can run **multiple shop agents** — each polls a different website's API for invoice jobs and fulfills them via local `fnn`.

## User flow

1. Open the **Agents** tab.
2. Click **Add agent** and fill in:
   - **Name** — label (e.g. "Art store", "Side project")
   - **Shop API URL** — base URL of your backend
   - **Merchant ID** + **API token** — from your shop's pairing flow
3. Save — polling starts automatically if the node is reachable.
4. Add more agents for other websites.

Each agent runs independently in the background while the app is open.

## What your backend must expose

The agent expects these endpoints (paths are configurable per agent):

### `GET {pollJobsPath}?merchantId=…`

Response:

```json
{ "jobs": [{ "jobId": "j1", "orderId": "42", "amountCkb": "10", "description": "optional" }] }
```

### `POST {submitInvoicePath}`

Body:

```json
{
  "jobId": "j1",
  "orderId": "42",
  "invoiceAddress": "fibt1…",
  "paymentHash": "0x…"
}
```

Both requests send `Authorization: Bearer {apiToken}`.

Default paths: `/api/merchant/jobs` and `/api/merchant/invoices`.

You may use different routes per shop — set them under **Advanced paths & timing**.

## Storage

Agent configs are saved to `{app_data}/shop_agents.json`. API tokens are stored in that file; treat the data directory as sensitive.

## Backend & checkout UI (integrators)

Use [**fiber-peer-pay**](../../fiber-peer-pay) on your website:

- **`@fiber-peer-pay/node`** — implement the order queue and agent routes
- **`@fiber-peer-pay/react`** — buyer checkout component (poll order, show invoice)

Fiber Desktop handles invoice creation; your app does not call `fnn` directly.

## Implementation (this app)

- Rust: [`shop_agents.rs`](../app/src-tauri/src/shop_agents.rs)
- UI: [`AgentsTab.tsx`](../app/src/components/AgentsTab.tsx)
