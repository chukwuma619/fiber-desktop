import type { ClientOs } from "./clientOs";
import { isLikelyAppleSilicon } from "./clientOs";
import type { GithubLatestRelease, GithubReleaseAsset } from "./githubRelease";

export type InstallerKind =
  | "dmg"
  | "exe"
  | "msi"
  | "appimage"
  | "deb"
  | "rpm"
  | "app-tar"
  | "other";

export type InstallerRow = {
  name: string;
  url: string;
  size: number;
  os: ClientOs;
  installerKind: InstallerKind;
};

function shouldSkipAssetName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".sig") ||
    lower.endsWith(".sha256sum") ||
    lower.endsWith(".blockmap") ||
    lower.endsWith(".pdb") ||
    lower.endsWith(".symbols.zip")
  );
}

function classifyAsset(
  asset: GithubReleaseAsset,
): { os: ClientOs; installerKind: InstallerKind } | null {
  if (shouldSkipAssetName(asset.name)) return null;
  const lower = asset.name.toLowerCase();

  if (lower.endsWith(".dmg")) {
    return { os: "macos", installerKind: "dmg" };
  }
  if (lower.endsWith(".exe")) {
    return { os: "windows", installerKind: "exe" };
  }
  if (lower.endsWith(".msi")) {
    return { os: "windows", installerKind: "msi" };
  }
  if (lower.endsWith(".appimage")) {
    return { os: "linux", installerKind: "appimage" };
  }
  if (lower.endsWith(".deb")) {
    return { os: "linux", installerKind: "deb" };
  }
  if (lower.endsWith(".rpm")) {
    return { os: "linux", installerKind: "rpm" };
  }
  if (lower.endsWith(".tar.gz")) {
    if (
      lower.includes("darwin") ||
      lower.includes(".app") ||
      lower.includes("macos")
    ) {
      return { os: "macos", installerKind: "app-tar" };
    }
  }
  return null;
}

export function installersFromRelease(
  release: GithubLatestRelease,
): InstallerRow[] {
  const rows: InstallerRow[] = [];
  for (const a of release.assets) {
    const c = classifyAsset(a);
    if (!c) continue;
    rows.push({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
      os: c.os,
      installerKind: c.installerKind,
    });
  }
  return rows;
}

function dmgArchScore(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("universal")) return 3;
  if (lower.includes("aarch64") || lower.includes("arm64")) return 2;
  if (lower.includes("x64") || lower.includes("x86") || lower.includes("intel"))
    return 1;
  return 0;
}

function pickMacDmg(rows: InstallerRow[]): InstallerRow | undefined {
  const dmgs = rows.filter((r) => r.os === "macos" && r.installerKind === "dmg");
  if (dmgs.length === 0) return undefined;
  const universal = dmgs.find((d) => d.name.toLowerCase().includes("universal"));
  if (universal) return universal;

  const wantArm = isLikelyAppleSilicon();
  const armCandidates = dmgs.filter(
    (d) =>
      /aarch64|arm64|apple|silicon/i.test(d.name) &&
      !/x64|x86|intel/i.test(d.name),
  );
  const intelCandidates = dmgs.filter(
    (d) =>
      /x64|x86|intel|amd64/i.test(d.name) &&
      !/aarch64|arm64/i.test(d.name),
  );

  if (wantArm && armCandidates.length > 0) {
    return armCandidates.sort((a, b) => dmgArchScore(b.name) - dmgArchScore(a.name))[0];
  }
  if (!wantArm && intelCandidates.length > 0) {
    return intelCandidates.sort((a, b) => dmgArchScore(b.name) - dmgArchScore(a.name))[0];
  }
  return dmgs.sort((a, b) => dmgArchScore(b.name) - dmgArchScore(a.name))[0];
}

function pickWindows(rows: InstallerRow[]): InstallerRow | undefined {
  const win = rows.filter((r) => r.os === "windows");
  const exe = win.find((r) => r.installerKind === "exe");
  if (exe) return exe;
  const msi = win.find((r) => r.installerKind === "msi");
  if (msi) return msi;
  return win[0];
}

function pickLinux(rows: InstallerRow[]): InstallerRow | undefined {
  const linux = rows.filter((r) => r.os === "linux");
  const order: InstallerKind[] = ["appimage", "deb", "rpm"];
  for (const kind of order) {
    const hit = linux.find((r) => r.installerKind === kind);
    if (hit) return hit;
  }
  return linux[0];
}

/** Single best installer URL for this OS, if the release ships one. */
export function pickRecommendedInstaller(
  clientOs: ClientOs,
  rows: InstallerRow[],
): InstallerRow | undefined {
  if (rows.length === 0) return undefined;
  switch (clientOs) {
    case "macos": {
      const dmg = pickMacDmg(rows);
      if (dmg) return dmg;
      return rows.find((r) => r.os === "macos");
    }
    case "windows":
      return pickWindows(rows);
    case "linux":
      return pickLinux(rows);
    case "unknown":
      return undefined;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function installerKindLabel(kind: InstallerKind): string {
  switch (kind) {
    case "dmg":
      return "Disk image (.dmg)";
    case "exe":
      return "Setup (.exe)";
    case "msi":
      return "Installer (.msi)";
    case "appimage":
      return "AppImage";
    case "deb":
      return "Debian package (.deb)";
    case "rpm":
      return "RPM package (.rpm)";
    case "app-tar":
      return "Archive (.tar.gz)";
    case "other":
      return "Download";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function osLabel(os: ClientOs): string {
  switch (os) {
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
    case "unknown":
      return "Other";
    default: {
      const _exhaustive: never = os;
      return _exhaustive;
    }
  }
}
