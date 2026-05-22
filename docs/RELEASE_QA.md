# Release QA checklist

Manual verification before publishing a tagged release or signing off on a major PR. Use CI bundle artifacts when you cannot build every platform locally.

CI produces installers on pull requests (`bundle-macos`, `bundle-macos-intel`, `bundle-windows`, `bundle-linux`) and on tag push via [release.yml](../.github/workflows/release.yml).

## Prerequisites for testers

- A clean machine or VM (or uninstall the previous Fiber Desktop build).
- Testnet or mainnet CKB RPC reachable from the test environment.
- A CKB private key file for testnet (export with [ckb-cli](https://github.com/nervosnetwork/ckb-cli); see [DEVELOPMENT.md](DEVELOPMENT.md#first-launch)).

## All platforms

- [ ] Installer opens and the app launches without a blank window.
- [ ] **Guided setup** completes (or skip → configure **Setup** tab manually).
- [ ] **Start** node succeeds; **Stop** succeeds; logs appear on the Node tab.
- [ ] **Network** tab shows node info / peer connectivity after start.
- [ ] **Channels** tab loads (no RPC errors when node is running).
- [ ] **Receive** generates an invoice; **Send** accepts a test invoice (testnet only, small amount).
- [ ] App restart: node can be stopped cleanly; optional orphan adoption does not leave a zombie `fnn`.
- [ ] Keychain / Credential Manager / Secret Service: password prompt behavior is acceptable (macOS: “Always Allow” if prompted repeatedly).

## macOS

- [ ] `.dmg` installs via drag-to-Applications (or CI artifact equivalent).
- [ ] Gatekeeper: unsigned builds may require right-click → Open on first launch (document for users if not notarized).
- [ ] **Open the key folder** opens Finder at `{data_dir}/ckb/`.

## Windows

- [ ] `.exe` (NSIS) or `.msi` installer completes.
- [ ] WebView2 present (window not blank on Windows 10 1803+).
- [ ] **Open the key folder** opens Explorer.
- [ ] Developers: confirm dev workflow still works from **Git Bash** (`bun run setup`, `bun run tauri dev`).

## Linux

- [ ] `.AppImage`, `.deb`, or `.rpm` launches (test the formats you ship).
- [ ] Secret Service / keyring available in the desktop session (password storage works).
- [ ] **Open the key folder** opens the file manager.

## Regression hotspots

| Area | What to watch |
|------|----------------|
| fnn sidecar | Wrong arch binary, failed download, version mismatch with RPC |
| CKB key | Missing `ckb/key`, wrong path, start blocked with clear error |
| Port 1420 | Dev-only: Vite port conflict after unclean shutdown |
| Config sync | `config.yml` CKB RPC URL matches selected network in Setup |

## After release

- [ ] [GitHub Release](https://github.com/chukwuma619/fiber-desktop/releases) assets match expected platforms.
- [ ] Marketing `/download` page shows the new version (uses `releases/latest`).
- [ ] Release notes mention breaking changes (fnn pin bumps, config migrations).

## See also

- [Development guide](DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)
