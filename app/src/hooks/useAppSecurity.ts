import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

export function useAppSecurity(setLoadError: (msg: string | null) => void) {
  const [password, setPassword] = useState("");
  const [hasPw, setHasPw] = useState<boolean | null>(null);

  const refreshSecurity = useCallback(async () => {
    try {
      const raw = await invoke<boolean | string | number>(
        "has_fnn_secret_password",
      );
      const present =
        raw === true || raw === 1 || raw === "true" || raw === "1";
      setHasPw(present);
    } catch {
      setHasPw(false);
    }
  }, []);

  const savePassword = useCallback(
    async (rawInput: string, onSaved?: () => void) => {
      const raw = rawInput.trim();
      if (!raw) return false;
      try {
        await invoke("set_fnn_secret_password", { password: raw });
        setPassword("");
        setHasPw(true);
        onSaved?.();
        await refreshSecurity();
        return true;
      } catch (e) {
        setLoadError(String(e));
        void refreshSecurity();
        return false;
      }
    },
    [refreshSecurity, setLoadError],
  );

  return {
    password,
    setPassword,
    hasPw,
    refreshSecurity,
    savePassword,
  };
}
