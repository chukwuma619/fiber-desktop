import { open } from "@tauri-apps/plugin-dialog";
import { useCallback } from "react";

function pathFromDialogResult(
  selected: string | string[] | null,
): string | null {
  if (selected === null) return null;
  return Array.isArray(selected) ? selected[0] ?? null : selected;
}

export function usePathPickers() {
  const pickDirectory = useCallback(async (): Promise<string | null> => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    return pathFromDialogResult(selected);
  }, []);

  const pickConfigFile = useCallback(async (): Promise<string | null> => {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "YAML config", extensions: ["yml", "yaml"] }],
    });
    return pathFromDialogResult(selected);
  }, []);

  const pickFnnBinary = useCallback(async (): Promise<string | null> => {
    const selected = await open({
      directory: false,
      multiple: false,
    });
    return pathFromDialogResult(selected);
  }, []);

  return { pickDirectory, pickConfigFile, pickFnnBinary };
}
