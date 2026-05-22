# Fiber Desktop — marketing site

Static website for Fiber Desktop: landing page, download links, and user guides (setup, send, receive, about the project).

This package is separate from the Tauri desktop app in [`app/`](../app/). It does not bundle or run `fnn`.

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** or **22.12+**
- [Bun](https://bun.sh/) (recommended; matches the rest of the repo)

## Commands

From this directory (`marketing/`):

```bash
bun install
bun run dev      # local preview (Vite dev server)
bun run build    # production static build → dist/
bun run lint     # ESLint
bun run preview  # preview production build
```

## Environment variables

Optional overrides in `.env` or your deploy environment (see [`src/constants/marketing.ts`](src/constants/marketing.ts)):

| Variable | Purpose |
|----------|---------|
| `VITE_FIBER_DESKTOP_REPO_URL` | GitHub repo URL for source/issues links (default: `https://github.com/chukwuma619/fiber-desktop`) |
| `VITE_FIBER_DESKTOP_RELEASES_URL` | Full releases page URL (default: `{repo}/releases`) |

The download page uses the GitHub API `releases/latest` to list installer assets.

## Project docs

- [Root README](../README.md) — project overview
- [Development guide](../docs/DEVELOPMENT.md) — building the desktop app
- [Contributing](../docs/CONTRIBUTING.md)
