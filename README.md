# Fiber Desktop

Desktop shell for [Fiber Network Node (fnn)](https://github.com/nervosnetwork/fiber): manage channels and settings from a local app. Built with **Tauri 2**, **React**, and **Vite**.

## Prerequisites

Install these once on your machine:

| Requirement | Notes |
|-------------|--------|
| [Bun](https://bun.sh/) | This repo uses `bun.lock`; install Bun and use `bun` for all scripts below. |
| [Rust](https://www.rust-lang.org/tools/install) | Stable toolchain; required for `rustc` (used when preparing the fnn binary) and for Tauri. |
| [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) | OS-specific packages (WebKit, MSVC build tools on Windows, etc.). |

**Windows:** The fnn sidecar script is a Bash script. Use **Git Bash**, **MSYS2**, or **WSL** so `bash` is available, or run commands from an environment where Bun can invoke Bash.

## Quick start

From the repository root:

```bash
bun run setup
bun run tauri dev
```

That is all you need for local development.

### What each step does

1. **`bun run setup`** — Installs JavaScript dependencies and downloads the pinned **fnn** binary into `src-tauri/binaries/` (matching [`PINNED_FNN_TAG`](src-tauri/src/fnn_fetch.rs)). Requires network access to GitHub releases.
2. **`bun run tauri dev`** — Starts the Vite dev server and opens the desktop app. `tauri.conf.json` also runs `prepare:fnn` before dev/build, so the sidecar stays in sync if you skip `setup` later.

### Scripts

| Command | Purpose |
|---------|---------|
| `bun run setup` | `bun install` + download fnn sidecar (recommended after clone). |
| `bun run prepare:fnn` | Download/update fnn only (also runs automatically before `tauri dev` / `tauri build`). |
| `bun run tauri dev` | Run the app in development. |
| `bun run tauri build` | Production build and bundled app installers. |
| `bun run dev` / `bun run build` | Frontend-only Vite commands (without Tauri). |

## When you open the app

1. **Guided setup opens automatically** the first time (until you finish it or choose “Skip for now”). Follow the steps in order: network → node program → config file → keychain password → **wallet key file**.
2. **Wallet / CKB key:** Fiber is not a browser extension wallet. Export a CKB secp256k1 private key (for example with `ckb-cli account export`) and save it as a single file named `key` inside the `ckb` folder under your node data directory. Use **Open the key folder** (Node tab or guided setup) so the correct folder opens in Finder / Explorer.
3. **Password:** The password you store in the app encrypts that key file when the node runs; it does not create the key.
4. **Start the node** from Overview or the Node tab, then use the **Network** tab to connect to public relays and try RPC actions.

## CKB key file (required before `fnn` can run)

Fiber’s node expects a **CKB secp256k1 private key** on disk (not the same as the app keychain password):

- Path: **`{your FNN data directory}/ckb/key`** (one line of hex; often from `ckb-cli account export`).
- Default data directory (unless you change it in Setup): **`~/.fiber_desktop/fnn-data`** on macOS and Linux, or **`%USERPROFILE%\.fiber_desktop\fnn-data`** on Windows. App settings are stored in **`~/.fiber_desktop/settings.json`** (same Windows pattern under `.fiber_desktop`).
- The password you save in Fiber Desktop encrypts this file when `fnn` starts; it does **not** create the key.

See the official guide: [Fiber testnet nodes / key setup](https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md).

If the key is missing, **Start** will show a clear error instead of a Rust panic in the logs.

## Troubleshooting

- **macOS keychain keeps asking for your login password** — If you click **Allow**, macOS may ask again the next time the app needs to read the stored secret (for example when you **Start** the node). Choose **Always Allow** so you are not prompted every time. The app also avoids decrypting the secret just to show “password saved” in the UI (that pattern could trigger repeated prompts on macOS).
- **`prepare:fnn` fails with “rustc: command not found”** — Install Rust and ensure `rustc` is on your `PATH`, then run `bun run setup` again.
- **Download errors for fnn** — Check firewall/VPN and that [Fiber releases](https://github.com/nervosnetwork/fiber/releases) are reachable.
- **Port 1420 in use** — Another process is using Vite’s port; stop it or adjust [`vite.config.ts`](vite.config.ts) and [`tauri.conf.json`](src-tauri/tauri.conf.json) together.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
