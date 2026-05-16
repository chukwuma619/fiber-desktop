/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. https://github.com/org/fiber-desktop/releases */
  readonly VITE_FIBER_DESKTOP_RELEASES_URL?: string;
  /** e.g. https://github.com/org/fiber-desktop */
  readonly VITE_FIBER_DESKTOP_REPO_URL?: string;
}
