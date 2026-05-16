/** Coarse OS bucket for matching GitHub release assets to the visitor's machine. */
export type ClientOs = "macos" | "windows" | "linux" | "unknown";

export function detectClientOs(): ClientOs {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform;
  const platform = uaData || navigator.platform || "";

  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(platform) || /Mac OS X|Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(platform) || /Linux|X11/i.test(ua)) return "linux";
  return "unknown";
}

/**
 * Best-effort Apple Silicon detection for choosing aarch64 vs x64 .dmg when both exist.
 */
export function isLikelyAppleSilicon(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/arm64|aarch64/i.test(ua)) return true;
  return false;
}
