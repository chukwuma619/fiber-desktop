# Development guide

How to build and run [Fiber Desktop](../README.md) locally. The desktop app lives in [`app/`](../app/) and is built with [Tauri 2](https://v2.tauri.app/), [React](https://react.dev/), and [Vite](https://vite.dev/).

## Table of contents

- [Before you clone](#before-you-clone)
- [Requirements](#requirements)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
- [Getting started](#getting-started)
- [fnn sidecar](#fnn-sidecar)
- [First launch](#first-launch)
- [Scripts](#scripts)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)
- [Recommended tooling](#recommended-tooling)

## Before you clone

Fiber Desktop is a **[Tauri 2](https://v2.tauri.app/)** desktop app (macOS, Windows, Linux). You do **not** need Android/iOS tooling unless you plan to port the app to mobile.

Install prerequisites in this order (same as the [official Tauri guide](https://v2.tauri.app/start/prerequisites/)):

| Step | What | Why |
|------|------|-----|
| 1 | **System dependencies** for your OS | WebView, C++ toolchain, GTK/WebKit on Linux, etc. |
| 2 | **Rust** (stable, via [rustup](https://rustup.rs/)) | Tauri backend |
| 3 | **Node.js** **20.19+** or **22.12+** | React + Vite frontend |
| 4 | **[Bun](https://bun.sh/)** | This repo’s package manager (`bun.lock`) |
| 5 | **`bash`**, **`curl`**, **`tar`** | Downloads the pinned **fnn** sidecar (`app/scripts/prepare-fnn-sidecar.sh`) |

After cloning, from the `app/` folder:

```bash
bun run setup      # bun install + download fnn
bun run tauri dev  # compile Rust, start UI
```

**Windows:** use **Git Bash** for those commands, not plain PowerShell/CMD (see [Windows](#windows)).

If anything fails, check [Troubleshooting](#troubleshooting) or the [Tauri prerequisites troubleshooting](https://v2.tauri.app/start/prerequisites/#troubleshooting) section.

## Requirements

Install everything below **before** `bun run setup`. Platform details follow the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) page; this section adds **Fiber Desktop–specific** notes.

| Tool | Version | Purpose |
|------|---------|---------|
| System deps | per OS | [Tauri prerequisites → System Dependencies](https://v2.tauri.app/start/prerequisites/#system-dependencies) |
| [Rust](https://www.rust-lang.org/tools/install) | stable | Tauri backend |
| [Node.js](https://nodejs.org/) | **20.19+** or **22.12+** | Vite 7 dev server |
| [Bun](https://bun.sh/) | latest | `bun install`, scripts |
| `bash`, `curl`, `tar` | on `PATH` | `prepare:fnn` sidecar download |

### macOS

Follow [Tauri → macOS](https://v2.tauri.app/start/prerequisites/#macos). **Desktop-only** is enough: install **Xcode Command Line Tools** (you do not need the full Xcode app unless you target iOS).

1. **System dependencies (Tauri)**

   ```bash
   xcode-select --install
   ```

   Open Xcode once after a full Xcode install so it can finish setup (CLI tools only: skip this).

2. **Rust (Tauri)** — [rustup](https://rustup.rs/):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

   Restart the terminal, then `rustc --version`.

3. **Node.js** — **20.19+** or **22.12+** ([nodejs.org](https://nodejs.org/) or nvm/fnm).

4. **Bun** — [Bun installation guide](https://bun.sh/docs/installation).

5. **Fiber Desktop extras** — `bash`, `curl`, and `tar` (included with macOS).

**Verify your setup** (Terminal, iTerm, or your IDE terminal):

```bash
bun --version
node --version    # must be v20.19+ or v22.12+
rustc --version
cargo --version
bash --version
```

### Windows

Follow [Tauri → Windows](https://v2.tauri.app/start/prerequisites/#windows). Supported: **Windows 7 and later** (WebView2 is preinstalled on Windows 10 1803+).

Use **Git Bash** for all Fiber Desktop commands (`bun run setup`, `bun run tauri dev`). PowerShell/CMD will fail when `bash scripts/prepare-fnn-sidecar.sh` runs.

Install dependencies with [Chocolatey](https://chocolatey.org/) (`choco`, Administrator terminal) and/or [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/) (PowerShell). Restart Git Bash after installing.

1. **System dependencies (Tauri)**

   - **Microsoft C++ Build Tools** — install [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and check **Desktop development with C++** (same as Tauri docs).
   - **WebView2** — usually already installed; if the app window is blank, install the [WebView2 Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
   - **MSI builds only:** enable the **VBSCRIPT** optional Windows feature if `tauri build` fails on MSI ([Tauri note](https://v2.tauri.app/start/prerequisites/#vbscript-for-msi-installers)).

2. **Rust (Tauri)** — MSVC toolchain (`x86_64-pc-windows-msvc`). [rustup](https://rustup.rs/) or:

   ```powershell
   winget install --id Rustlang.Rustup
   ```

   Then in a new terminal: `rustup default stable-msvc` and `rustc --version`.

3. **Node.js** — **20.19+** or **22.12+** (see commands below).

4. **Bun** — [Bun installation guide](https://bun.sh/docs/installation) or `choco install bun -y`.

5. **Fiber Desktop extras** — **Git for Windows** (Git Bash provides `bash`, `curl`, `tar`):

   ```powershell
   choco install git -y
   ```

   ```powershell
   winget install Git.Git --accept-package-agreements --accept-source-agreements
   ```

   Optional Chocolatey shortcuts for Tauri system deps:

   ```powershell
   choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" -y
   choco install nodejs-lts -y
   choco install microsoft-edge-webview2 -y
   ```

   ```powershell
   winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
   ```

   Close and reopen **Git Bash** after installing, then confirm `node --version`.

**Verify your setup** in **Git Bash** (Start menu → Git Bash):

```bash
bun --version
node --version    # must be v20.19+ or v22.12+
rustc --version
cargo --version
bash --version
curl --version
```

> **Tip:** In VS Code, set **Terminal → Select Default Profile → Git Bash** so integrated terminals use the correct shell.
>
> If you see *“Windows Subsystem for Linux has no installed distributions”*, PowerShell is calling WSL’s `bash` stub instead of Git Bash. Open Git Bash directly, or install WSL (`wsl --install -d Ubuntu`).

### Linux

Follow [Tauri → Linux](https://v2.tauri.app/start/prerequisites/#linux). Package names differ by distro; the [Tauri prerequisites page](https://v2.tauri.app/start/prerequisites/#linux) lists Arch, Fedora, openSUSE, Alpine, NixOS, and more.

1. **System dependencies (Tauri)** — Debian/Ubuntu (matches [official Tauri list](https://v2.tauri.app/start/prerequisites/#linux) plus `patchelf` for bundling in CI):

   ```bash
   sudo apt update
   sudo apt install -y \
     libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     patchelf
   ```

   Other distros: use the exact command for your distribution on the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#linux) page.

2. **Rust (Tauri)** — [rustup](https://rustup.rs/):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Node.js** — **20.19+** or **22.12+**.

4. **Bun** — [Bun installation guide](https://bun.sh/docs/installation).

5. **Fiber Desktop extras** — `bash`, `curl`, and `tar` (installed with the apt command above). Passwords use the desktop **Secret Service** (GNOME Keyring, KWallet, etc.); ensure a keyring daemon is running in your session.

**Verify:**

```bash
bun --version
node --version
rustc --version
bash --version
```

## Getting started

### Checklist (after prerequisites)

- [ ] Cloned the repo and `cd fiber-desktop/app`
- [ ] `bun run setup` finished (fnn sidecar in `src-tauri/binaries/`)
- [ ] `bun run tauri dev` opens the desktop window
- [ ] Completed **Guided setup** in the app (or skipped and configured **Setup**)

### 1. Clone the repository

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/app
```

On **Windows**, use **Git Bash** for every step below.

### 2. Install dependencies and download fnn

```bash
bun run setup
```

This runs `bun install` and downloads the pinned **fnn** sidecar into `src-tauri/binaries/` (version in [`app/src-tauri/src/fnn_fetch.rs`](../app/src-tauri/src/fnn_fetch.rs)). Requires network access to [Fiber GitHub releases](https://github.com/nervosnetwork/fiber/releases).

If this fails, confirm [Requirements](#requirements) (especially Rust on `PATH` and `bash`/`curl`/`tar`).

### 3. Start the app in development

```bash
bun run tauri dev
```

This will:

1. Run `prepare:fnn` if the sidecar is missing
2. Start the Vite dev server at [http://localhost:1420](http://localhost:1420)
3. Compile the Rust backend and open the Tauri window

The **first** run can take several minutes while Cargo builds dependencies. Later runs are much faster.

**Frontend only** (no desktop shell): `bun run dev` — useful for UI work; node start/stop and keychain features need `tauri dev`.

## fnn sidecar

Fiber Desktop does not reimplement the Fiber protocol. It bundles and manages the official **Fiber Network Node** binary (`fnn`) from [nervosnetwork/fiber](https://github.com/nervosnetwork/fiber).

| Item | Location |
|------|----------|
| Pinned version | `v0.8.1` — keep in sync: [`fnn_fetch.rs`](../app/src-tauri/src/fnn_fetch.rs) (`PINNED_FNN_TAG`) and [`prepare-fnn-sidecar.sh`](../app/scripts/prepare-fnn-sidecar.sh) (`TAG`) |
| Download script | `app/scripts/prepare-fnn-sidecar.sh` (invoked via `bun run prepare:fnn`) |
| On-disk binaries | `app/src-tauri/binaries/fnn-{target-triple}` |
| Tauri bundle config | `externalBin: ["binaries/fnn"]` in [`tauri.conf.json`](../app/src-tauri/tauri.conf.json) |

Resolution order at runtime: configured path in settings → bundled sidecar → `fnn` on `PATH` (see [`bundled_fnn.rs`](../app/src-tauri/src/bundled_fnn.rs)).

## First launch

When you open the app for the first time:

1. **Guided setup** runs automatically (until you finish or choose “Skip for now”). Complete the steps in order: network → node program → config file → unlock password (Keychain / Credential Manager / keyring) → wallet key file.
2. **CKB key file** — Fiber is not a browser wallet. Export a CKB secp256k1 private key and save it as a file named `key` in the `ckb` folder under your node data directory. Use **Open the key folder** in the app to open that folder in your file manager.

   With [ckb-cli](https://github.com/nervosnetwork/ckb-cli):

   ```bash
   ckb-cli account export --path <account> --output-format json
   ```

   See the [ckb-cli README](https://github.com/nervosnetwork/ckb-cli) for account management.

3. **Password** — the password stored in the app encrypts your key file when the node runs; it does not create the key.
4. **Start the node** from Overview or the Node tab, then use the Network tab to connect to relays.

For more detail, see the [Fiber testnet nodes / key setup guide](https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md) and [Fiber documentation](https://www.fiber.world/docs).

**Key file path:** `{your FNN data directory}/ckb/key` (single line of hex).

## Scripts

Run from the `app/` directory:

| Command | Description |
|---------|-------------|
| `bun run setup` | Install JS dependencies and download the fnn sidecar (run once after clone) |
| `bun run prepare:fnn` | Download or refresh the fnn sidecar only |
| `bun run tauri dev` | Run the desktop app in development |
| `bun run tauri build` | Build production installers |
| `bun run dev` | Frontend only (Vite, no Tauri window) |
| `bun run build` | Frontend production build only |

## Production build

```bash
bun run tauri build
```

Installers are written to `app/src-tauri/target/release/bundle/` (`.dmg` on macOS, `.msi` / `.exe` on Windows, `.AppImage` / `.deb` / `.rpm` on Linux).

Tagged releases (`v*`) are built automatically by [`.github/workflows/release.yml`](../.github/workflows/release.yml). See [RELEASE_QA.md](RELEASE_QA.md) for manual verification before shipping.

## Troubleshooting

For install issues (WebView2, C++ Build Tools, Linux packages, Rust toolchain), see the official [Tauri prerequisites → Troubleshooting](https://v2.tauri.app/start/prerequisites/#troubleshooting) and [Tauri Discord](https://discord.com/invite/tauri).

### `cargo metadata` — program not found

Rust is missing or not on your `PATH`.

1. Install [Rust](https://rustup.rs/)
2. Restart your terminal
3. Confirm `cargo --version` works
4. Run `bun run setup` again

### `Windows Subsystem for Linux has no installed distributions`

You ran a command from PowerShell/CMD instead of Git Bash. Open **Git Bash** and retry, or install WSL. See [Windows requirements](#windows).

### `crypto.hash is not a function` or Vite Node.js version warning

Your Node.js version is too old. Vite 7 requires **Node 20.19+** or **22.12+**.

```bash
node --version
```

Upgrade Node.js, restart your terminal, and run `bun run tauri dev` again. On Windows:

```powershell
choco upgrade nodejs-lts -y
```

```powershell
winget upgrade OpenJS.NodeJS.LTS
```

### `Error: Port 1420 is already in use`

A previous dev server is still running (often from an earlier `bun run tauri dev` that was not stopped cleanly).

**macOS / Git Bash:**

```bash
lsof -i :1420
kill <PID>
```

**Windows (PowerShell or CMD):**

```powershell
netstat -ano | findstr :1420
taskkill /PID <PID> /F
```

Then run `bun run tauri dev` again. If the port stays busy, close VS Code terminals or restart your machine.

### `prepare:fnn` fails with `rustc: command not found`

Install Rust and ensure `rustc` is on your `PATH`, then run `bun run setup` again.

### fnn download fails

Check your network, firewall, or VPN. Confirm [Fiber releases](https://github.com/nervosnetwork/fiber/releases) are reachable from your machine.

### macOS keychain keeps prompting for your password

When macOS asks to access the keychain, choose **Always Allow** so you are not prompted on every node start. The app avoids unnecessary keychain reads in the UI to reduce repeated prompts.

### Node fails to start — missing CKB key

Place your key file at `{FNN data directory}/ckb/key` before pressing **Start**. The app shows a clear error if the key is missing.

## Recommended tooling

- [VS Code](https://code.visualstudio.com/)
- [Tauri VS Code extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## See also

- [Architecture](ARCHITECTURE.md) — how the Tauri shell, fnn sidecar, and UI fit together
- [Contributing](CONTRIBUTING.md) — PR workflow and CI checks
- [Release QA](RELEASE_QA.md) — cross-platform smoke checklist
