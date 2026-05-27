const SHANNONS_PER_CKB = 100_000_000n;

/** Parse human CKB (e.g. `500`, `400.5`, up to 8 decimal places) → `0x…` shannons hex for RPC. */
export function ckbAmountToShannonsHex(ckbText: string): string | null {
  const t = ckbText.trim().replace(/,/g, "");
  if (!t) return null;
  const m = /^(\d+)(?:\.(\d{1,8}))?$/.exec(t);
  if (!m) return null;
  const whole = BigInt(m[1]);
  const fracStr = m[2] ?? "";
  if (fracStr.length > 8) return null;
  const fracShannons =
    fracStr === "" ? 0n : BigInt(fracStr) * 10n ** (8n - BigInt(fracStr.length));
  const shannons = whole * SHANNONS_PER_CKB + fracShannons;
  if (shannons <= 0n) return null;
  return `0x${shannons.toString(16)}`;
}

/** Format shannons hex back to a short CKB label for display (best effort). */
export function shannonsHexToCkbLabel(hex: string): string {
  const t = hex.trim();
  if (!t) return "—";
  try {
    const n = BigInt(t.startsWith("0x") || t.startsWith("0X") ? t : `0x${t}`);
    const base = 100_000_000n;
    const whole = n / base;
    const frac = n % base;
    if (frac === 0n) return `${whole.toString()} CKB`;
    const fracStr = frac.toString().padStart(8, "0").replace(/0+$/, "");
    return `${whole.toString()}.${fracStr} CKB`;
  } catch {
    return hex;
  }
}
