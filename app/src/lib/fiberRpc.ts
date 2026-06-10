import { invoke } from "@tauri-apps/api/core";
import {
  FiberRpcCallError,
  fiberRpcErrorFromInvoke,
} from "./fiberRpcError";

export async function callFiberRpc(method: string, params: unknown) {
  try {
    return await invoke<unknown>("fiber_rpc_call", { method, params });
  } catch (error) {
    throw new FiberRpcCallError(fiberRpcErrorFromInvoke(error));
  }
}

export { FiberRpcCallError, fiberRpcErrorFromInvoke } from "./fiberRpcError";
export type { FiberRpcError, FiberRpcErrorKind } from "./fiberRpcError";
