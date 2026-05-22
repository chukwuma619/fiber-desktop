# Fiber Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Desktop app for the [Fiber Network](https://www.fiber.world/docs) — a peer-to-peer payment and swap layer on [Nervos CKB](https://nervos.org). Fiber Desktop wraps the official [Fiber Network Node (`fnn`)](https://github.com/nervosnetwork/fiber) so you can run channels, send and receive payments, and manage node settings without living in a terminal.

Built with [Tauri 2](https://v2.tauri.app/start/), [React](https://react.dev/), and [Vite](https://vite.dev/).

## Features

- **Guided setup** — network, data directory, config, keychain password, and CKB key file
- **Node lifecycle** — start, stop, logs, and orphan process adoption after restart
- **Channels & payments** — open and manage channels, pay invoices, generate receive invoices
- **Network visibility** — node info and connectivity from the UI
- **Local-first security** — `fnn` runs on your machine; keys stay in your OS keychain and on-disk key file (not a hosted wallet)

## Download

Pre-built installers for macOS and Windows are on [GitHub Releases](https://github.com/chukwuma619/fiber-desktop/releases).

Linux builds (AppImage, `.deb`, `.rpm`) are produced in CI and attached to releases when tagged.

## Repository layout

```
fiber-desktop/
├── app/          # Tauri 2 desktop app (primary product)
├── marketing/    # Public website and user guides
├── docs/         # Developer and contributor documentation
└── .github/      # CI and release workflows
```

## Quick start (developers)

Install [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (system deps, Rust, Node.js **20.19+** or **22.12+**, [Bun](https://bun.sh/)). On Windows, use **Git Bash** for all commands below.

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/app
bun run setup
bun run tauri dev
```

Full setup, platform notes, and troubleshooting: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

## Documentation

| Document | Audience |
|----------|----------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local build, prerequisites, scripts, first launch |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tauri shell, `fnn` sidecar, IPC, security model |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Issues, PRs, CI checks, releases |
| [docs/RELEASE_QA.md](docs/RELEASE_QA.md) | Cross-platform release smoke checklist |
| [app/README.md](app/README.md) | Desktop package quick reference |
| [marketing/README.md](marketing/README.md) | Public website development |

## Related projects

- [nervosnetwork/fiber](https://github.com/nervosnetwork/fiber) — Fiber Network Node (`fnn`) and protocol implementation
- [Fiber documentation](https://www.fiber.world/docs) — protocol and node guides
- [ckb-cli](https://github.com/nervosnetwork/ckb-cli) — CKB command-line tool (export keys, manage accounts)
- [Tauri 2](https://v2.tauri.app/start/) — desktop framework used by this app

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Chukwuma Ebube
