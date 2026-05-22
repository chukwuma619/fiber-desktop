export type CopyResult = "copied" | "failed";

/** Copy text with navigator API and a textarea fallback for WebView2. */
export async function copyTextToClipboard(text: string): Promise<CopyResult> {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    /* fall through */
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
