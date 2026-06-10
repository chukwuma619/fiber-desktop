import { useCallback, useState } from "react";
import {
  fiberRpcErrorFromInvoke,
  formatFiberRpcErrorTechnical,
} from "./fiberRpcError";
import type { FiberRpcError } from "./fiberRpcError";
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
  onError?: (method: string, error: FiberRpcError) => void;
  /** If set, shown in rpcError instead of the raw node message. */
  formatError?: (method: string, error: FiberRpcError) => string;
};

export function useRpc({
  callFiberRpc,
  onResult,
  onError,
  formatError,
}: UseRpcOptions) {
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
        const rpcErr = fiberRpcErrorFromInvoke(e);
        const technical = formatFiberRpcErrorTechnical(rpcErr);
        const display = formatError
          ? formatError(method, rpcErr)
          : rpcErr.message;
        setRpcError(display);
        setRawJson(technical);
        onError?.(method, rpcErr);
        pushHistory({
          label,
          ok: false,
          summary:
            technical.length > 120 ? `${technical.slice(0, 120)}…` : technical,
        });
        return undefined;
      } finally {
        setRpcBusy(null);
      }
    },
    [callFiberRpc, onResult, onError, formatError, pushHistory],
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
