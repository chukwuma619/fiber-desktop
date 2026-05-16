# Fiber Desktop — execution plan

Tauri 2 + React (TypeScript) + Bun. Goal: run **FNN** locally, connect to **public relay nodes**, and drive **JSON-RPC** for channels/payments ([public nodes doc](https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md)).

## Phase 0 — Verify boilerplate

- `bun install` (done if `node_modules` present)
- Rust + Tauri [prerequisites](https://v2.tauri.app/start/prerequisites/)
- `bun run tauri dev` — window + UI loads

## Phase 1 — Settings

- Mainnet/testnet, CKB `rpc_url`, FNN data dir, RPC port, secret handling (keychain / no plain-text passwords in logs)

## Phase 2 — FNN sidecar

- Bundle or download pinned `fnn`; spawn with `-c config.yml -d <data_dir>`, `FIBER_SECRET_KEY_PASSWORD`
- Logs + crash detection

## Phase 3 — RPC bridge

- Tauri commands or localhost-only client: `node_info`, `connect_peer`, `open_channel`, `list_channels`, `new_invoice`, `send_payment`, `graph_nodes` as needed

## Phase 4 — Easy-start UX

- Connect to documented **node1/node2** pubkeys; guided `open_channel` with `public: true`; pay/receive via invoices

## Phase 5 — Ship

- Tauri capabilities / CSP; CI; codesign (macOS)

**Scaffold note:** `bunx create-tauri-app@latest fiber-desktop --manager bun --template react-ts --yes --tauri-version 2`
