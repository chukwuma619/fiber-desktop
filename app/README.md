# Fiber Desktop

Desktop shell for the [Fiber Network Node (fnn)](https://github.com/nervosnetwork/fiber). Manage channels, payments, and node settings from a local app.

Built with [Tauri 2](https://v2.tauri.app/), [React](https://react.dev/), and [Vite](https://vite.dev/).

> **Marketing website:** to run the public site and user guides in `marketing/`, see [marketing/README.md](../marketing/README.md).

## Table of contents

- [Requirements](#requirements)
  - [macOS](#macos)
  - [Windows](#windows)
- [Getting started](#getting-started)
- [First launch](#first-launch)
- [Scripts](#scripts)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)
- [Recommended tooling](#recommended-tooling)

## Requirements

Install the tools for your platform **before** cloning. All commands below are run from the `app/` directory unless noted otherwise.

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh/) | latest | Package manager and script runner (`bun.lock`) |
| [Node.js](https://nodejs.org/) | **20.19+** or **22.12+** | Used by Vite 7 when starting the dev server |
| [Rust](https://www.rust-lang.org/tools/install) | stable | Tauri backend and fnn sidecar setup |
| [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) | — | OS-specific build tools and WebView runtimes |

The fnn binary is downloaded by a Bash script (`scripts/prepare-fnn-sidecar.sh`), which also needs **`bash`**, **`curl`**, and **`tar`** on your `PATH`.

### macOS

1. **Xcode Command Line Tools**

   ```bash
   xcode-select --install
   ```

2. **Bun** — follow the [Bun installation guide](https://bun.sh/docs/installation).

3. **Node.js** — install **20.19+** or **22.12+** (LTS recommended). [Download](https://nodejs.org/) or use a version manager such as [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm).

4. **Rust** — install via [rustup](https://rustup.rs/), then restart your terminal.

5. **Tauri dependencies** — follow the [macOS prerequisites](https://v2.tauri.app/start/prerequisites/#macos) if you have not built a Tauri app before.

**Verify your setup** (Terminal, iTerm, or your IDE terminal):

```bash
bun --version
node --version    # must be v20.19+ or v22.12+
rustc --version
cargo --version
bash --version
```

### Windows

Use **Git Bash** for all project commands. Plain PowerShell or CMD will fail when the setup script runs `bash`, unless you have configured a working Bash environment.

Install dependencies with [Chocolatey](https://chocolatey.org/) (`choco`, Administrator terminal) and/or [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/) (PowerShell). Restart your terminal after installing.

1. **Git for Windows** — Git Bash (`bash`, `curl`, `tar`).

   ```powershell
   choco install git -y
   ```

   ```powershell
   winget install Git.Git --accept-package-agreements --accept-source-agreements
   ```

2. **Bun** — [Bun installation guide](https://bun.sh/docs/installation), or:

   ```powershell
   choco install bun -y
   ```

3. **Node.js** — **20.19+** or **22.12+**.

   ```powershell
   choco install nodejs-lts -y
   ```

   ```powershell
   winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
   ```

   Close and reopen Git Bash after installing, then confirm with `node --version`.

4. **Rust** — default **MSVC** toolchain (`x86_64-pc-windows-msvc`).

   ```powershell
   choco install rust -y
   ```

   Or install via [rustup](https://rustup.rs/), then restart your terminal.

5. **Visual Studio Build Tools** — **Desktop development with C++** workload (required by Tauri).

   ```powershell
   choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" -y
   ```

   Or use the [Visual Studio Build Tools installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/). See [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows).

6. **WebView2** — included on most Windows 10/11 systems. If the app window does not open:

   ```powershell
   choco install microsoft-edge-webview2 -y
   ```

   Or install the [WebView2 Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

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

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/app
```

On **Windows**, run the following steps in **Git Bash**.

### 2. Install dependencies and download fnn

```bash
bun run setup
```

This runs `bun install` and downloads the pinned **fnn** sidecar into `src-tauri/binaries/` (version pinned in [`src-tauri/src/fnn_fetch.rs`](src-tauri/src/fnn_fetch.rs)). Network access to [GitHub releases](https://github.com/nervosnetwork/fiber/releases) is required.

### 3. Start the app in development

```bash
bun run tauri dev
```

This will:

1. Ensure the fnn sidecar is present (`prepare:fnn`)
2. Start the Vite dev server on [http://localhost:1420](http://localhost:1420)
3. Compile and launch the Tauri desktop window

The first run may take several minutes while Rust dependencies compile.

## First launch

When you open the app for the first time:

1. **Guided setup** runs automatically (until you finish or choose “Skip for now”). Complete the steps in order: network → node program → config file → keychain password → wallet key file.
2. **CKB key file** — Fiber is not a browser wallet. Export a CKB secp256k1 private key (for example with `ckb-cli account export`) and save it as a file named `key` in the `ckb` folder under your node data directory. Use **Open the key folder** in the app to open the correct location in Finder or Explorer.
3. **Password** — the password stored in the app encrypts your key file when the node runs; it does not create the key.
4. **Start the node** from Overview or the Node tab, then use the Network tab to connect to relays.

For more detail, see the [Fiber testnet nodes / key setup guide](https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md).

**Key file path:** `{your FNN data directory}/ckb/key` (single line of hex).

## Scripts

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

Installers are written to `src-tauri/target/release/bundle/` (`.dmg` on macOS, `.msi` / `.exe` on Windows).

## Troubleshooting

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
# Find the process using port 1420
lsof -i :1420

# Stop it (replace PID with the number from the previous command)
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

### Windows smoke testing

See [docs/WINDOWS_SMOKE.md](docs/WINDOWS_SMOKE.md) for a release checklist. CI builds Windows installers on every app change; download artifacts from the **bundle-windows** job if you do not have a local build.

### macOS keychain keeps prompting for your password

When macOS asks to access the keychain, choose **Always Allow** so you are not prompted on every node start. The app avoids unnecessary keychain reads in the UI to reduce repeated prompts.

### Node fails to start — missing CKB key

Place your key file at `{FNN data directory}/ckb/key` before pressing **Start**. The app shows a clear error if the key is missing.

## Recommended tooling

- [VS Code](https://code.visualstudio.com/)
- [Tauri VS Code extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
