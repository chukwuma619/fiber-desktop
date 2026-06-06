import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { ShopAgentConfig, ShopAgentRow } from "../types/shopAgents";

export function useShopAgents(active: boolean) {
  const [agents, setAgents] = useState<ShopAgentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await invoke<ShopAgentRow[]>("shop_agents_list");
      setAgents(rows);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [active, refresh]);

  const save = useCallback(async (config: ShopAgentConfig) => {
    setBusy(true);
    setError(null);
    try {
      const row = await invoke<ShopAgentRow>("shop_agents_save", { config });
      await refresh();
      return row;
    } catch (e) {
      const msg = String(e);
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await invoke("shop_agents_delete", { id });
        await refresh();
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      setBusy(true);
      setError(null);
      try {
        await invoke<ShopAgentRow>("shop_agents_set_enabled", { id, enabled });
        await refresh();
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return { agents, busy, error, setError, refresh, save, remove, setEnabled };
}
