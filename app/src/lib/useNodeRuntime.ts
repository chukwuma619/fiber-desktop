import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { FnnRuntimeSnapshot, FnnStatusView } from "../types/settings";

const POLL_ACTIVE_MS = 1500;
const POLL_IDLE_MS = 8000;
/** When idle, probe RPC every N status polls (8s × 2 ≈ 16s). */
const RPC_PROBE_IDLE_EVERY = 2;
const LOG_UI_CAP = 800;
const LOG_SNAPSHOT_LINES = 200;

async function fiberRpc(method: string, params: unknown) {
  return invoke<unknown>("fiber_rpc_call", { method, params });
}

function appendLogLine(prev: string[], line: string): string[] {
  const next = [...prev, line];
  if (next.length <= LOG_UI_CAP) {
    return next;
  }
  return next.slice(-LOG_UI_CAP);
}

export type UseNodeRuntimeOptions = {
  fnnRpcUrl: string | undefined;
  appMounted: RefObject<boolean>;
};

export function useNodeRuntime({ fnnRpcUrl, appMounted }: UseNodeRuntimeOptions) {
  const [fnnStatus, setFnnStatus] = useState<FnnStatusView | null>(null);
  const [fnnLogs, setFnnLogs] = useState<string[]>([]);
  const [rpcReachable, setRpcReachable] = useState(false);

  const pollSeqRef = useRef(0);
  const idleRpcProbeRef = useRef(0);
  const fnnKindRef = useRef<FnnStatusView["kind"]>("stopped");

  useEffect(() => {
    fnnKindRef.current = fnnStatus?.kind ?? "stopped";
  }, [fnnStatus?.kind]);

  const pollNodeRuntime = useCallback(
    async (opts: { includeLogs: boolean; probeRpc: boolean }) => {
      const seq = ++pollSeqRef.current;
      try {
        const snap = await invoke<FnnRuntimeSnapshot>("fnn_runtime_snapshot", {
          maxLogLines: opts.includeLogs ? LOG_SNAPSHOT_LINES : 0,
        });
        if (!appMounted.current || seq !== pollSeqRef.current) {
          return;
        }
        setFnnStatus(snap.status);
        if (opts.includeLogs) {
          setFnnLogs(snap.logs);
        }
      } catch {
        if (!appMounted.current || seq !== pollSeqRef.current) {
          return;
        }
        setFnnStatus(null);
      }

      if (!opts.probeRpc) {
        return;
      }
      const url = fnnRpcUrl?.trim();
      if (!url) {
        if (seq === pollSeqRef.current) {
          setRpcReachable(false);
        }
        return;
      }
      try {
        await fiberRpc("node_info", []);
        if (seq === pollSeqRef.current) {
          setRpcReachable(true);
        }
      } catch {
        if (seq === pollSeqRef.current) {
          setRpcReachable(false);
        }
      }
    },
    [fnnRpcUrl, appMounted],
  );

  const syncNodeRuntime = useCallback(
    () => pollNodeRuntime({ includeLogs: true, probeRpc: true }),
    [pollNodeRuntime],
  );

  const clearLogs = useCallback(() => {
    setFnnLogs([]);
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("fnn-log-line", (event) => {
      if (!appMounted.current) {
        return;
      }
      setFnnLogs((prev) => appendLogLine(prev, event.payload));
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [appMounted]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      const kind = fnnKindRef.current;
      const localActive = kind === "running";
      const probeRpc =
        !localActive &&
        (kind === "crashed" ||
          idleRpcProbeRef.current++ % RPC_PROBE_IDLE_EVERY === 0);

      await pollNodeRuntime({
        includeLogs: false,
        probeRpc,
      });
    };

    const schedule = () => {
      if (cancelled) {
        return;
      }
      const kind = fnnKindRef.current;
      const delay =
        kind === "running" || kind === "crashed" ? POLL_ACTIVE_MS : POLL_IDLE_MS;
      timer = window.setTimeout(() => {
        void tick().finally(schedule);
      }, delay);
    };

    void invoke<boolean>("fnn_adopt_orphan")
      .catch(() => false)
      .finally(() => {
        if (cancelled) {
          return;
        }
        void pollNodeRuntime({ includeLogs: true, probeRpc: true }).finally(
          schedule,
        );
      });

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [pollNodeRuntime]);

  return {
    fnnStatus,
    fnnLogs,
    rpcReachable,
    syncNodeRuntime,
    clearLogs,
  };
}
