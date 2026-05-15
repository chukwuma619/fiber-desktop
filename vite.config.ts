import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        shell: path.resolve(__dirname, "shell.html"),
        howItWorks: path.resolve(__dirname, "how-it-works.html"),
        howToSend: path.resolve(__dirname, "how-to-send.html"),
        howToReceive: path.resolve(__dirname, "how-to-receive.html"),
        howToSetup: path.resolve(__dirname, "how-to-setup.html"),
        aboutProject: path.resolve(__dirname, "about-project.html"),
      },
    },
  },
}));
