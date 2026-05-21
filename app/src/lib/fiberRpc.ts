import { invoke } from "@tauri-apps/api/core";

export async function callFiberRpc(method: string, params: unknown) {
  return invoke<unknown>("fiber_rpc_call", { method, params });
}
