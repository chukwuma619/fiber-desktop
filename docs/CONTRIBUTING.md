# Contributing

Thank you for contributing to Fiber Desktop. This project is open source under the [MIT License](../LICENSE).

## Getting started

1. Read the [Development guide](DEVELOPMENT.md) and install [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).
2. Clone the repo, `cd app`, run `bun run setup`, then `bun run tauri dev`.
3. Skim [Architecture](ARCHITECTURE.md) to understand the Tauri shell, `fnn` sidecar, and IPC surface.

## Reporting issues

- Search [existing issues](https://github.com/chukwuma619/fiber-desktop/issues) before opening a new one.
- Include your OS and version, Fiber Desktop version (or commit), and steps to reproduce.
- For **protocol or `fnn` bugs**, check [nervosnetwork/fiber](https://github.com/nervosnetwork/fiber) — Fiber Desktop wraps the official node binary.
- For **security vulnerabilities**, follow [SECURITY.md](../SECURITY.md) (do not open public issues for sensitive reports).

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep changes focused; match existing code style and naming.
3. Update documentation when behavior or setup steps change.
4. Open a PR with a clear description and test notes (platform tested).

### Checks before submitting

CI runs on changes under `app/`, `marketing/`, and workflow files. Locally, run what applies to your change:

**Desktop app** (`app/`):

```bash
cd app
bun run prepare:fnn
bun run build
cd src-tauri
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

**Marketing site** (`marketing/`):

```bash
cd marketing
bun install
bun run lint
bun run build
```

### Code conventions

- **TypeScript:** Keep imports at the top of the file. Use exhaustive `switch` handling for union types and enums.
- **Rust:** Run `cargo fmt` and address `clippy` warnings in `app/src-tauri/`.
- **fnn version:** If you bump the pinned `fnn` release, update both [`fnn_fetch.rs`](../app/src-tauri/src/fnn_fetch.rs) (`PINNED_FNN_TAG`) and [`prepare-fnn-sidecar.sh`](../app/scripts/prepare-fnn-sidecar.sh) (`TAG`).

## Releases

Maintainers publish releases by:

1. Bumping `version` in [`app/src-tauri/tauri.conf.json`](../app/src-tauri/tauri.conf.json) and [`app/package.json`](../app/package.json).
2. Committing to `main`.
3. Creating and pushing a tag `v*` (e.g. `v0.1.1`).

[`.github/workflows/release.yml`](../.github/workflows/release.yml) builds macOS, Windows, and Linux installers and attaches them to a GitHub Release. The marketing download page reads `releases/latest` automatically.

Before tagging, run through [RELEASE_QA.md](RELEASE_QA.md) on at least one platform (or use CI PR bundle artifacts).

## Related documentation

- [Fiber Network docs](https://www.fiber.world/docs)
- [Tauri 2 guides](https://v2.tauri.app/start/)
- [ckb-cli](https://github.com/nervosnetwork/ckb-cli) — CKB account and key management
