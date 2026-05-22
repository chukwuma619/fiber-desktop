import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useState } from "react";
import type { CkbKeyStatus } from "../types/settings";

export function useCkbKey(setLoadError: (msg: string | null) => void) {
  const [ckbKeyStatus, setCkbKeyStatus] = useState<CkbKeyStatus | null>(null);
  const [nodeTabPrivKey, setNodeTabPrivKey] = useState("");

  const refreshCkbKeyStatus = useCallback(async () => {
    try {
      setCkbKeyStatus(await invoke<CkbKeyStatus>("ckb_key_status"));
    } catch {
      setCkbKeyStatus(null);
    }
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => void refreshCkbKeyStatus(), 4000);
    return () => window.clearInterval(t);
  }, [refreshCkbKeyStatus]);

  const persistCkbPrivateKey = useCallback(
    async (keyInput: string, onSuccessClear: () => void) => {
      const t = keyInput.trim();
      if (!t) return;
      setLoadError(null);
      try {
        await invoke("write_ckb_private_key", { key: t });
        await refreshCkbKeyStatus();
        onSuccessClear();
      } catch (e) {
        setLoadError(String(e));
      }
    },
    [refreshCkbKeyStatus, setLoadError],
  );

  const openCkbKeyFolder = useCallback(async () => {
    setLoadError(null);
    let dir: string | null = null;
    try {
      dir = await invoke<string>("prepare_ckb_key_folder");
      await openPath(dir);
      void refreshCkbKeyStatus();
    } catch (e) {
      const msg = String(e);
      if (dir) {
        setLoadError(
          `${msg}\n\nOpen this folder manually in File Explorer or Finder:\n${dir}`,
        );
      } else {
        setLoadError(msg);
      }
    }
  }, [refreshCkbKeyStatus, setLoadError]);

  return {
    ckbKeyStatus,
    nodeTabPrivKey,
    setNodeTabPrivKey,
    refreshCkbKeyStatus,
    persistCkbPrivateKey,
    openCkbKeyFolder,
  };
}
