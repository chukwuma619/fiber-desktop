/** Join path segments using the separator style already present in `base`. */
export function joinPath(base: string, ...segments: string[]): string {
  const trimmed = base.trim().replace(/[/\\]+$/, "");
  if (!trimmed) {
    return segments.join("/");
  }
  const sep = trimmed.includes("\\") ? "\\" : "/";
  return [trimmed, ...segments].join(sep);
}

/** Display path for UI (native separators when the path looks Windows-style). */
export function displayPath(path: string): string {
  const p = path.trim();
  if (!p) return p;
  if (/^[A-Za-z]:[\\/]/.test(p) || p.includes("\\")) {
    return p.replace(/\//g, "\\");
  }
  return p;
}

/** CKB key file path under the FNN data directory. */
export function ckbKeyPath(dataDir: string | undefined): string {
  if (!dataDir?.trim()) {
    return "{data folder}/ckb/key";
  }
  return joinPath(dataDir, "ckb", "key");
}
