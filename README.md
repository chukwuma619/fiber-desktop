# Fiber Desktop

Monorepo for **Fiber Desktop** — a Tauri desktop app for running the [Fiber Network Node (fnn)](https://github.com/nervosnetwork/fiber), plus a marketing and documentation website.

| Package | Description | Docs |
|---------|-------------|------|
| [`app/`](app/) | Tauri 2 desktop app (React + Vite + Rust) | [app/README.md](app/README.md) |
| [`marketing/`](marketing/) | Public marketing site and user guides (React + Vite) | [marketing/README.md](marketing/README.md) |

## Quick links

**Desktop app (macOS / Windows)**

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/app
bun run setup
bun run tauri dev
```

See [app/README.md](app/README.md) for platform prerequisites (Rust, Git Bash on Windows, Node.js 20.19+, etc.).

**Marketing website**

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/marketing
bun install
bun run dev
```

See [marketing/README.md](marketing/README.md) for full setup, environment variables, and build instructions.
