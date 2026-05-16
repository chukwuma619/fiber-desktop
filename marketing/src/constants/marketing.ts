/** Public repo (clone / issues / source). */
export const FIBER_DESKTOP_REPO_URL =
  (import.meta.env.VITE_FIBER_DESKTOP_REPO_URL as string | undefined)?.trim() ||
  "https://github.com/chukwuma619/fiber-desktop";

/**
 * GitHub Releases page for macOS (.dmg) and Windows installers.
 * Override with `VITE_FIBER_DESKTOP_RELEASES_URL` when deploying the marketing site.
 */
export function fiberDesktopReleasesUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_FIBER_DESKTOP_RELEASES_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;
  return `${FIBER_DESKTOP_REPO_URL}/releases`;
}
