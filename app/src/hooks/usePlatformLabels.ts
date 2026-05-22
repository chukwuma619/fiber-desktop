import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export type PlatformLabels = {
  os: string;
  secretStorageName: string;
  savePasswordLabel: string;
  checkingPasswordLabel: string;
  terminalHint: string;
  fileManagerName: string;
};

const FALLBACK: PlatformLabels = {
  os: "unknown",
  secretStorageName: "system secure storage",
  savePasswordLabel: "Save password",
  checkingPasswordLabel: "Checking…",
  terminalHint: "terminal running ",
  fileManagerName: "your file manager",
};

export function usePlatformLabels(): PlatformLabels {
  const [labels, setLabels] = useState<PlatformLabels>(FALLBACK);

  useEffect(() => {
    void invoke<PlatformLabels>("get_platform_labels")
      .then(setLabels)
      .catch(() => setLabels(FALLBACK));
  }, []);

  return labels;
}
