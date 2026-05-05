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

## Troubleshooting

- **`prepare:fnn` fails with “rustc: command not found”** — Install Rust and ensure `rustc` is on your `PATH`, then run `bun run setup` again.
- **Download errors for fnn** — Check firewall/VPN and that [Fiber releases](https://github.com/nervosnetwork/fiber/releases) are reachable.
- **Port 1420 in use** — Another process is using Vite’s port; stop it or adjust [`vite.config.ts`](vite.config.ts) and [`tauri.conf.json`](src-tauri/tauri.conf.json) together.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
