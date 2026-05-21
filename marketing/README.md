# Fiber Desktop — Marketing site

Public marketing website and user guides for Fiber Desktop. Built with [React](https://react.dev/), [React Router](https://reactrouter.com/), and [Vite](https://vite.dev/).

For the Tauri desktop app, see [app/README.md](../app/README.md).

## Table of contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)

## Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh/) | latest | Package manager (`bun.lock`) |
| [Node.js](https://nodejs.org/) | **20.19+** or **22.12+** | Used by Vite when running the dev server and build |

Unlike the desktop app in `app/`, this package does **not** require Rust, Tauri, or Git Bash. You can use Terminal (macOS), Git Bash, PowerShell, or CMD on Windows.

**Verify your setup:**

```bash
bun --version
node --version    # must be v20.19+ or v22.12+
```

### macOS

Install [Bun](https://bun.sh/docs/installation) and [Node.js](https://nodejs.org/) (20.19+ or 22.12+ LTS). Any standard terminal works.

### Windows

1. Install [Bun](https://bun.sh/docs/installation), or:

   ```powershell
   choco install bun -y
   ```

2. Install Node.js **20.19+** or **22.12+** with [Chocolatey](https://chocolatey.org/) (Administrator terminal) or winget:

   ```powershell
   choco install nodejs-lts -y
   ```

   ```powershell
   winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
   ```

   Restart your terminal, then confirm `node --version`.

PowerShell, CMD, and Git Bash all work for the marketing site.

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/chukwuma619/fiber-desktop.git
cd fiber-desktop/marketing
```

### 2. Install dependencies

```bash
bun install
```

### 3. Run the dev server

```bash
bun run dev
```

Vite prints the local URL (default [http://localhost:5173](http://localhost:5173)). Open it in your browser.

### 4. Lint (optional)

```bash
bun run lint
```

## Environment variables

Optional overrides for download and repository links. Create a `.env` file in `marketing/` if needed:

```env
# GitHub repo shown on the site (clone, issues, source)
VITE_FIBER_DESKTOP_REPO_URL=https://github.com/chukwuma619/fiber-desktop

# Releases page for macOS / Windows installer downloads
VITE_FIBER_DESKTOP_RELEASES_URL=https://github.com/chukwuma619/fiber-desktop/releases
```

If unset, defaults point to the repository above. Restart `bun run dev` after changing `.env`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start Vite dev server with hot reload |
| `bun run build` | Typecheck and build static assets to `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | Run ESLint |

## Production build

```bash
bun run build
```

Output is written to `marketing/dist/`. Deploy that folder to any static host (Vercel, Netlify, GitHub Pages, etc.).

Preview the build locally:

```bash
bun run preview
```

## Troubleshooting

### Vite Node.js version warning or `crypto.hash is not a function`

Upgrade Node.js to **20.19+** or **22.12+**, restart your terminal, and run `bun run dev` again.

On Windows:

```powershell
choco upgrade nodejs-lts -y
```

```powershell
winget upgrade OpenJS.NodeJS.LTS
```

### Port already in use

Another process is using Vite’s port (default **5173**). Stop the other dev server, or start Vite on a different port:

```bash
bun run dev -- --port 5174
```

**macOS / Linux:**

```bash
lsof -i :5173
kill <PID>
```

**Windows (PowerShell):**

```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### ESLint or TypeScript errors after pull

Reinstall dependencies:

```bash
bun install
bun run lint
bun run build
```
