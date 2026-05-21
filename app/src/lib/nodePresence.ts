import type { FnnStatusView } from "../types/settings";

/** fnn exits when RocksDB cannot lock the store (second process / stray fnn). */
export function logTextIndicatesFiberStoreLock(logs: string[]): boolean {
  const t = logs.join("\n");
  if (!t.includes("LOCK") || !t.includes("fiber")) {
    return false;
  }
  return (
    t.includes("temporarily unavailable") ||
    t.includes("Would block") ||
    t.includes("already held") ||
    t.includes("Os { code: 35") ||
    t.includes("os error 35")
  );
}

/** Unified UI: local child wins; else RPC `node_info` means something already serves this URL. */
export type NodePresenceKind = "stopped" | "running" | "crashed" | "remote";

export function deriveNodePresence(
  fnn: FnnStatusView | null,
  rpcReachable: boolean,
): NodePresenceKind {
  if (fnn?.kind === "running") {
    return "running";
  }
  if (fnn?.kind === "crashed") {
    return "crashed";
  }
  if (rpcReachable) {
    return "remote";
  }
  return "stopped";
}

export function nodePresenceStatusLabel(presence: NodePresenceKind): string {
  switch (presence) {
    case "running":
      return "Running";
    case "remote":
      return "Reachable";
    case "crashed":
      return "Crashed";
    case "stopped":
      return "Stopped";
  }
}

export function nodePresenceHeroSubOneLine(presence: NodePresenceKind): string {
  switch (presence) {
    case "running":
      return "Answering at the Node API URL from Setup.";
    case "remote":
      return "Another process may be using this URL—open Network to use RPC.";
    case "crashed":
      return "See the Node tab for details in the log.";
    case "stopped":
      return "Finish setup, then start your node here.";
  }
}

export function nodePresenceHeroSubFullTitle(presence: NodePresenceKind): string {
  switch (presence) {
    case "running":
      return "It should answer at the address you set under Setup → Network.";
    case "remote":
      return "Something is already serving your Node API URL—try the Network tab. Use Stop node when this app owns the process, or stop the other fnn first if you want to start here.";
    case "crashed":
      return "Open the Node tab and read the logs for details.";
    case "stopped":
      return "Use Guided setup on Overview if you are new, then start your node here.";
  }
}
