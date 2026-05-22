import { useCallback, useState } from "react";
import { copyTextToClipboard } from "../lib/clipboard";

export function useCopyWithFeedback() {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    const result = await copyTextToClipboard(text);
    setCopyFeedback(result === "copied" ? "Copied" : "Copy failed");
    window.setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  return { copy, copyFeedback };
}
