# Fiber Desktop

Desktop shell for [Fiber Network Node (fnn)](https://github.com/nervosnetwork/fiber): manage channels and settings from a local app. Built with **Tauri 2**, **React**, and **Vite**.

## Prerequisites

Install everything below before cloning. All platforms need the same core tools; each OS also has extra packages for Tauri and for the fnn sidecar download script.

### All platforms

| Requirement | Notes |
|-------------|--------|
| [Bun](https://bun.sh/) | This repo uses `bun.lock`; use `bun` for all scripts below. |
| [Rust](https://www.rust-lang.org/tools/install) | Stable toolchain (`rustc`, `cargo`). Required for Tauri and for `prepare:fnn` (detects your host triple). After install, **restart your terminal** so `cargo` is on `PATH`. |
| [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) | OS-specific build tools and WebView runtimes — follow the guide for your OS. |

The fnn sidecar is downloaded by a Bash script (`scripts/prepare-fnn-sidecar.sh`). It also needs **`curl`** and **`tar`** on your `PATH` (included with Git Bash on Windows; usually present on macOS and Linux).

### macOS

1. Install [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) (`xcode-select --install`).
2. Install Bun and Rust (links above).
3. Use **Terminal**, **iTerm**, or your IDE’s integrated terminal.

Verify:

```bash
bun --version
rustc --version
cargo --version
bash --version
```

### Linux

1. Install Bun and Rust (links above).
2. Install your distro’s Tauri dependencies — see [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux) (WebKitGTK, build essentials, etc.).

Verify:

```bash
bun --version
rustc --version
cargo --version
bash --version
```

### Windows

Windows needs a few extra steps. **Do not use plain PowerShell or CMD** for `bun run setup` or `bun run tauri dev` unless `bash` resolves to a real Bash shell (see below).

1. **[Git for Windows](https://git-scm.com/download/win)** — provides **Git Bash**, which includes `bash`, `curl`, and `tar`. This is the recommended way to run this project on Windows.
2. **[Rust](https://rustup.rs/)** — choose the default **MSVC** toolchain (`x86_64-pc-windows-msvc`).
3. **[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)** — install the **“Desktop development with C++”** workload (required by Tauri). See [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows).
4. **WebView2** — usually already installed on Windows 10/11; install the [Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) if the app window fails to open.

Open **Git Bash** (Start menu → “Git Bash”), then verify:

```bash
bun --version
rustc --version
cargo --version
bash --version
curl --version
```

**Important:** If PowerShell runs `bash` and you see *“Windows Subsystem for Linux has no installed distributions”*, Windows is using the WSL stub instead of Git Bash. Either run all commands from **Git Bash**, or install a WSL distro (`wsl --install -d Ubuntu`). Git Bash is simpler for this repo.

In VS Code, set the default terminal to Git Bash: **Terminal → Select Default Profile → Git Bash**.

## Getting started

Clone the repo, install prerequisites for your OS (above), then run setup and dev from the **`app/`** directory.

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/app
```

**Windows:** open **Git Bash** before continuing.

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
- The password you save in Fiber Desktop encrypts this file when `fnn` starts; it does **not** create the key.

See the official guide: [Fiber testnet nodes / key setup](https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md).

If the key is missing, **Start** will show a clear error instead of a Rust panic in the logs.

## Troubleshooting

- **macOS keychain keeps asking for your login password** — If you click **Allow**, macOS may ask again the next time the app needs to read the stored secret (for example when you **Start** the node). Choose **Always Allow** so you are not prompted every time. The app also avoids decrypting the secret just to show “password saved” in the UI (that pattern could trigger repeated prompts on macOS).
- **`cargo metadata` / `program not found` when running `bun run tauri dev`** — Rust is not installed or not on `PATH`. Install [Rust](https://rustup.rs/), restart your terminal, and confirm `cargo --version` works before retrying.
- **`Windows Subsystem for Linux has no installed distributions` (Windows)** — PowerShell is invoking WSL’s `bash` stub, not Git Bash. Run `bun run setup` and `bun run tauri dev` from **Git Bash**, or install WSL. See [Windows prerequisites](#windows) above.
- **`prepare:fnn` fails with “rustc: command not found”** — Install Rust and ensure `rustc` is on your `PATH`, then run `bun run setup` again.
- **Download errors for fnn** — Check firewall/VPN and that [Fiber releases](https://github.com/nervosnetwork/fiber/releases) are reachable.
- **Port 1420 in use** — Another process is using Vite’s port; stop it or adjust [`vite.config.ts`](vite.config.ts) and [`tauri.conf.json`](src-tauri/tauri.conf.json) together.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
