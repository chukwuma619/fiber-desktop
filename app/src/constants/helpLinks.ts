/** Public marketing site — override at build time for forks/deployments. */
export const FIBER_DESKTOP_SITE_URL =
  (import.meta.env.VITE_FIBER_DESKTOP_SITE_URL as string | undefined)?.trim() ||
  "https://fiber-desktop.vercel.app";

export const HELP_GUIDES = {
  setup: `${FIBER_DESKTOP_SITE_URL}/how-to-setup`,
  send: `${FIBER_DESKTOP_SITE_URL}/how-to-send`,
  receive: `${FIBER_DESKTOP_SITE_URL}/how-to-receive`,
  index: `${FIBER_DESKTOP_SITE_URL}/how-it-works`,
  download: `${FIBER_DESKTOP_SITE_URL}/download`,
} as const;
