export type Network = "mainnet" | "testnet";

export interface AppSettings {
  network: Network;
  ckbRpcUrl: string;
  fnnDataDir: string;
  fnnConfigPath: string;
  fnnBinaryPath: string;
  fnnRpcUrl: string;
}

export interface FnnStatusView {
  kind: "stopped" | "running" | "crashed";
  pid: number | null;
  exitCode: number | null;
}

export interface FnnRuntimeSnapshot {
  status: FnnStatusView;
  logs: string[];
}

export interface PinnedFnnInfo {
  tag: string;
  assetFileName: string;
  downloadUrl: string;
}

export type FnnBinarySource =
  | "bundled"
  | "downloaded"
  | "custom"
  | "unavailable";

export interface FnnBinaryStatus {
  pinnedTag: string;
  bundledPath: string | null;
  isBundled: boolean;
  bundledAvailable: boolean;
  activePath: string;
  executableReady: boolean;
  activeSource: FnnBinarySource;
}

export function fnnBinarySourceLabel(source: FnnBinarySource): string {
  switch (source) {
    case "bundled":
      return "App-included build";
    case "downloaded":
      return "Downloaded release";
    case "custom":
      return "Custom path";
    case "unavailable":
      return "Not found";
  }
}

export interface CkbKeyStatus {
  ready: boolean;
  keyPath: string;
}
