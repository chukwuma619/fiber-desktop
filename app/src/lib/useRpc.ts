import { useCallback, useState } from "react";
import { summarizeRpcResult } from "./networkRpcParse";

const HISTORY_CAP = 20;

export type HistoryItem = {
  id: string;
  at: number;
  label: string;
  ok: boolean;
  summary: string;
};

export type UseRpcOptions = {
  callFiberRpc: (method: string, params: unknown) => Promise<unknown>;
  onResult?: (method: string, result: unknown) => void;
  onError?: (method: string, message: string) => void;
};

export function useRpc({ callFiberRpc, onResult, onError }: UseRpcOptions) {
  const [rpcBusy, setRpcBusy] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [rawJson, setRawJson] = useState<string>("");

  const pushHistory = useCallback(
    (entry: Omit<HistoryItem, "id" | "at">) => {
      setHistory((h) =>
        [
          {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: Date.now(),
          },
          ...h,
        ].slice(0, HISTORY_CAP),
      );
    },
    [],
  );

  const runRpc = useCallback(
    async (label: string, method: string, params: unknown) => {
      setRpcBusy(label);
      setRpcError(null);
      try {
        const result = await callFiberRpc(method, params);
        setRawJson(JSON.stringify(result, null, 2));
        onResult?.(method, result);
        pushHistory({ label, ok: true, summary: summarizeRpcResult(method, result) });
        return result;
      } catch (e) {
        const msg = String(e);
        setRpcError(msg);
        setRawJson(msg);
        onError?.(method, msg);
        pushHistory({
          label,
          ok: false,
          summary: msg.length > 120 ? `${msg.slice(0, 120)}…` : msg,
        });
        return undefined;
      } finally {
        setRpcBusy(null);
      }
    },
    [callFiberRpc, onResult, onError, pushHistory],
  );

  const busy = (label: string) => rpcBusy === label;
  const anyBusy = !!rpcBusy;

  return {
    runRpc,
    rpcBusy,
    rpcError,
    setRpcError,
    history,
    rawJson,
    busy,
    anyBusy,
  };
}
