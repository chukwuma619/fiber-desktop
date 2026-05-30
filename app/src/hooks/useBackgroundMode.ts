import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { RUN_IN_BACKGROUND } from "../constants/storageKeys";

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(RUN_IN_BACKGROUND);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function useBackgroundMode() {
  const [runInBackground, setRunInBackgroundState] = useState(readStored);

  const syncToBackend = useCallback(async (enabled: boolean) => {
    try {
      await invoke("set_hide_on_close", { enabled });
    } catch {
      // dev without Tauri shell
    }
  }, []);

  useEffect(() => {
    void syncToBackend(runInBackground);
  }, [runInBackground, syncToBackend]);

  const setRunInBackground = useCallback(
    (enabled: boolean) => {
      setRunInBackgroundState(enabled);
      try {
        localStorage.setItem(RUN_IN_BACKGROUND, enabled ? "1" : "0");
      } catch {
        // ignore
      }
      void syncToBackend(enabled);
    },
    [syncToBackend],
  );

  return { runInBackground, setRunInBackground };
}
