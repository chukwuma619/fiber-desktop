import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useState } from "react";
import type { FnnBinaryStatus, PinnedFnnInfo } from "../types/settings";

export function useFnnBinary(
  refreshSettings: () => Promise<unknown>,
  setLoadError: (msg: string | null) => void,
) {
  const [fnnBinaryStatus, setFnnBinaryStatus] =
    useState<FnnBinaryStatus | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<PinnedFnnInfo | null>(null);
  const [toolsBusy, setToolsBusy] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number;
    total: number | null;
    phase: "downloading" | "extracting";
  } | null>(null);

  const refreshPinned = useCallback(async () => {
    try {
      setPinnedInfo(await invoke<PinnedFnnInfo>("pinned_fnn_info"));
    } catch {
      setPinnedInfo(null);
    }
  }, []);

  const refreshFnnBinaryStatus = useCallback(async () => {
    try {
      setFnnBinaryStatus(await invoke<FnnBinaryStatus>("fnn_binary_status"));
    } catch {
      setFnnBinaryStatus(null);
    }
  }, []);

  /** Resolve bundled/downloaded/PATH fnn and persist when the saved path was empty or missing. */
  const ensureFnnBinary = useCallback(async () => {
    try {
      const status = await invoke<FnnBinaryStatus>("ensure_fnn_binary");
      setFnnBinaryStatus(status);
      await refreshSettings();
      return status;
    } catch (e) {
      setLoadError(String(e));
      return null;
    }
  }, [refreshSettings, setLoadError]);

  const downloadPinnedFnn = useCallback(async () => {
    setToolsBusy("dl");
    setDownloadProgress(null);
    setLoadError(null);
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<{
        downloaded: number;
        total: number | null;
        phase: "downloading" | "extracting";
      }>("fnn-download-progress", (event) => {
        setDownloadProgress(event.payload);
      });
      await invoke<string>("download_pinned_fnn");
      await refreshSettings();
      await refreshFnnBinaryStatus();
    } catch (e) {
      setLoadError(String(e));
    } finally {
      unlisten?.();
      setDownloadProgress(null);
      setToolsBusy(null);
    }
  }, [refreshSettings, refreshFnnBinaryStatus, setLoadError]);

  const useBundledFnn = useCallback(async () => {
    setToolsBusy("useBundled");
    setLoadError(null);
    try {
      await invoke<string>("use_bundled_fnn_binary");
      await refreshSettings();
      await refreshFnnBinaryStatus();
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }, [refreshSettings, refreshFnnBinaryStatus, setLoadError]);

  const installUpstreamConfig = useCallback(async () => {
    setToolsBusy("cfg");
    setLoadError(null);
    try {
      await invoke("install_upstream_fnn_config");
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }, [setLoadError]);

  const applyCkbRpcToConfigFile = useCallback(async () => {
    setToolsBusy("rpc");
    setLoadError(null);
    try {
      await invoke("apply_ckb_rpc_to_config_file");
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setToolsBusy(null);
    }
  }, [setLoadError]);

  return {
    fnnBinaryStatus,
    pinnedInfo,
    toolsBusy,
    downloadProgress,
    refreshPinned,
    refreshFnnBinaryStatus,
    ensureFnnBinary,
    downloadPinnedFnn,
    useBundledFnn,
    installUpstreamConfig,
    applyCkbRpcToConfigFile,
  };
}
