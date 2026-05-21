import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import type { NetworkId } from "../lib/publicNodes";
import type { AppSettings, Network } from "../types/settings";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await invoke<AppSettings>("get_settings");
      setSettings(s);
      setLoadError(null);
      return s;
    } catch (e) {
      setLoadError(String(e));
      return null;
    }
  }, []);

  const saveSettings = useCallback(async () => {
    if (!settings) return false;
    setSavedOk(false);
    try {
      await invoke("save_settings", { settings });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2200);
      return true;
    } catch (e) {
      setLoadError(String(e));
      return false;
    }
  }, [settings]);

  const applyNetworkDefaults = useCallback((net: NetworkId) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, network: net as Network };
      if (net === "mainnet") {
        next.ckbRpcUrl = "https://mainnet.ckbapp.dev/";
      } else {
        next.ckbRpcUrl = "https://testnet.ckbapp.dev/";
      }
      return next;
    });
  }, []);

  return {
    settings,
    setSettings,
    loadError,
    setLoadError,
    savedOk,
    refreshSettings,
    saveSettings,
    applyNetworkDefaults,
  };
}
