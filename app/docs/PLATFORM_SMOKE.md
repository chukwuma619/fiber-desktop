# Desktop smoke test checklist (all platforms)

Tauri 2 desktop targets: **macOS**, **Windows**, and **Linux**. Run the sections below on each OS you ship (or at least once per release on your slowest platform).

## Get a build

| OS | CI artifact job | Release assets |
|----|-----------------|----------------|
| macOS (Apple Silicon) | `bundle-macos` → `.dmg` | `*_aarch64.dmg` or arm64-named `.dmg` on GitHub Release |
| macOS (Intel) | `bundle-macos-intel` → `.dmg` | `*_x64.dmg` or x86-named `.dmg` on GitHub Release |
| Windows | `bundle-windows` → `.exe` / `.msi` | `*.exe`, `*.msi` |
| Linux | `bundle-linux` → AppImage / deb / rpm | `.AppImage`, `.deb`, `.rpm` |

CI also runs **clippy** on Ubuntu (Linux cfg), **clippy-windows** (Windows cfg), and **cargo test** (Rust unit tests) on every app change.

## All platforms

- [ ] App window opens (WebView / WebView2 / WebKitGTK).
- [ ] **Guided setup** completes: network → node program → config → password → CKB key.
- [ ] Security copy matches the OS (Keychain / Credential Manager / Secret Service).
- [ ] **Browse…** on Setup → advanced paths picks folders/files.
- [ ] **Start node** → logs stream; **Stop** → **Start** again within a few seconds.
- [ ] Quit while node is running, reopen — orphan adoption or clean start.
- [ ] Second `fnn` on same `-d` path → **Data folder is already in use** banner.
- [ ] **Open folder** (CKB key) works, or error shows path to open manually.
- [ ] **Copy** on Send / Receive / Channels shows “Copied” or “Copy failed”.

## macOS

- [ ] No repeated Keychain prompts when UI checks password status (prefer “Always Allow” once).
- [ ] Built-in `fnn` sidecar or downloaded binary runs (Apple Silicon and Intel builds as applicable).

## Windows

- [ ] No flashing console when `fnn` starts (`CREATE_NO_WINDOW`).
- [ ] Credential Manager entry for `com.ebube.fiber-desktop` after saving password.
- [ ] SmartScreen on first install (unsigned builds) — document if expected.

## Linux

- [ ] GTK/WebKit deps satisfied on target distro (see [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux)).
- [ ] Password stored via Secret Service / keyring (GNOME Keyring, KWallet, etc.).
- [ ] AppImage or distro package launches from file manager.

## Developers without every OS

Rely on CI: `check` (Linux clippy + frontend build + Rust tests), `clippy-windows`, `bundle-macos`, `bundle-macos-intel`, `bundle-windows`, `bundle-linux`. Download PR artifacts for manual spot-checks before tagging a release.
