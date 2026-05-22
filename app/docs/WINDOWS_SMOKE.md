# Windows smoke test checklist

> **Full checklist (all OS):** [PLATFORM_SMOKE.md](PLATFORM_SMOKE.md)

Run this once per release (or after large Windows-related changes) on a Windows 10/11 machine or [Windows dev VM](https://developer.microsoft.com/en-us/windows/downloads/virtual-machines/).

## Get a build

1. **CI artifact** — open the PR or `main` workflow run → **bundle-windows** job → download `fiber-desktop-windows` (NSIS `.exe` and/or MSI).
2. **GitHub Release** — download the `.exe` or `.msi` from the latest `v*` tag release.

## Install and first run

- [ ] Installer completes without SmartScreen blocking (unsigned builds may show a warning — choose “More info” → “Run anyway” if expected).
- [ ] App window opens (WebView2 present).
- [ ] **Guided setup** completes: network → node program → config → password → CKB key.
- [ ] Password save shows **Credential Manager** wording (not “Keychain”).
- [ ] **Browse…** on Setup → advanced paths picks folders/files without typing `C:\` by hand.

## Node lifecycle

- [ ] **Start node** — logs appear; no flashing console window behind the app.
- [ ] **Stop node** — process exits; **Start** again works within a few seconds (no stale PID).
- [ ] Quit app while node is running, reopen app — orphan adoption or clean start works.

## Data folder lock

- [ ] Start `fnn` in PowerShell with the same `-d` data path, then start from Fiber Desktop — UI shows **Data folder is already in use** (not only raw log text).

## CKB key folder

- [ ] **Open folder** on Node tab opens Explorer at `{data}\ckb`.
- [ ] With a custom data dir under `%USERPROFILE%`, open folder still works (or error shows the path to open manually).

## Clipboard

- [ ] **Copy** on Send / Receive / Channels shows “Copied” or “Copy failed” toast.

## Credential Manager

- [ ] After saving password, entry exists under Windows Credential Manager for service `com.ebube.fiber-desktop`.

## Optional

- [ ] Download official `fnn` from Setup tools succeeds (Defender may scan — allow if prompted).
- [ ] Firewall prompt for P2P/RPC if applicable — allow on private network for local use.

## Notes for developers without a Windows PC

- **clippy-windows** and **bundle-windows** jobs in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) compile and build all `#[cfg(windows)]` code on every app change (`clippy-windows` uses `app/src-tauri`).
- Fix failures from those jobs before relying on a manual VM pass.
