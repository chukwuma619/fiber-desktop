# Fiber Desktop (app)

Desktop shell for the [Fiber Network Node (`fnn`)](https://github.com/nervosnetwork/fiber). Manage channels, payments, and node settings from a native app on macOS, Windows, and Linux.

Built with [Tauri 2](https://v2.tauri.app/), [React](https://react.dev/), and [Vite](https://vite.dev/).

## Prerequisites

Install [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS, plus **Bun** and **Node.js 20.19+** or **22.12+**. On Windows, use **Git Bash** for all commands below.

See the full guide: **[docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)**.

## Quick commands

From this directory (`app/`):

```bash
bun run setup        # once after clone: install deps + download fnn sidecar
bun run tauri dev    # development (Vite + Tauri window)
bun run tauri build  # production installers → src-tauri/target/release/bundle/
```

Other scripts: `bun run dev` (frontend only), `bun run prepare:fnn`, `bun run build`.

## Documentation

- [Development guide](../docs/DEVELOPMENT.md) — setup, first launch, troubleshooting
- [Architecture](../docs/ARCHITECTURE.md) — process model, IPC commands, Tauri capabilities
- [Contributing](../docs/CONTRIBUTING.md) — PR workflow and CI
- [Release QA](../docs/RELEASE_QA.md) — smoke checklist before shipping
- [Fiber docs](https://www.fiber.world/docs) · [ckb-cli](https://github.com/nervosnetwork/ckb-cli) (CKB keys)

## Marketing site

The public website and user guides live in [`marketing/`](../marketing/). See [marketing/README.md](../marketing/README.md).
