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

export interface PinnedFnnInfo {
  tag: string;
  assetFileName: string;
  downloadUrl: string;
}

export interface FnnBinaryStatus {
  pinnedTag: string;
  bundledPath: string | null;
  isBundled: boolean;
  bundledAvailable: boolean;
  activePath: string;
}
