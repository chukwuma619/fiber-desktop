export type FiberRpcErrorKind =
  | "config"
  | "transport"
  | "parse"
  | "rpc"
  | "missing_result";

export type FiberRpcError = {
  kind: FiberRpcErrorKind;
  message: string;
  code?: number;
  data?: unknown;
};

const LEGACY_RPC_ERROR_PREFIX = /^RPC error:\s*(\{[\s\S]+\})\s*$/;

function isFiberRpcErrorKind(value: unknown): value is FiberRpcErrorKind {
  return (
    value === "config" ||
    value === "transport" ||
    value === "parse" ||
    value === "rpc" ||
    value === "missing_result"
  );
}

function isFiberRpcError(value: unknown): value is FiberRpcError {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isFiberRpcErrorKind(record.kind) &&
    typeof record.message === "string" &&
    (record.code === undefined || typeof record.code === "number")
  );
}

function parseLegacyRpcError(raw: string): FiberRpcError | null {
  const match = LEGACY_RPC_ERROR_PREFIX.exec(raw.trim());
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1]) as Record<string, unknown>;
    const message =
      typeof payload.message === "string" ? payload.message : raw;
    return {
      kind: "rpc",
      message,
      code: typeof payload.code === "number" ? payload.code : undefined,
      data: payload.data,
    };
  } catch {
    return null;
  }
}

function inferKindFromMessage(raw: string): FiberRpcErrorKind {
  const lower = raw.toLowerCase();
  if (lower.includes("rpc url is empty")) return "config";
  if (lower.includes("invalid json from node")) return "parse";
  if (lower.includes("missing result")) return "missing_result";
  if (
    lower.includes("transport error") ||
    lower.includes("connection refused") ||
    lower.includes("failed to connect") ||
    lower.includes("network unreachable") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return "transport";
  }
  return "rpc";
}

function stripKnownPrefix(raw: string): string {
  const prefixes = [
    "RPC transport error: ",
    "invalid JSON from node: ",
    "RPC response missing result",
  ];
  for (const prefix of prefixes) {
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length);
    }
  }
  return raw;
}

/** Normalize any Fiber RPC invoke failure into a structured error object. */
export function fiberRpcErrorFromInvoke(error: unknown): FiberRpcError {
  if (error instanceof FiberRpcCallError) {
    return error.rpc;
  }

  if (isFiberRpcError(error)) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") {
      const kind = isFiberRpcErrorKind(record.kind)
        ? record.kind
        : inferKindFromMessage(record.message);
      return {
        kind,
        message: record.message,
        code: typeof record.code === "number" ? record.code : undefined,
        data: record.data,
      };
    }
  }

  const raw = String(error).trim();
  if (!raw) {
    return { kind: "rpc", message: "Unknown RPC error" };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isFiberRpcError(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }

  const legacy = parseLegacyRpcError(raw);
  if (legacy) return legacy;

  const kind = inferKindFromMessage(raw);
  return {
    kind,
    message: stripKnownPrefix(raw),
  };
}

/** Technical detail for Activity / Advanced panels. */
export function formatFiberRpcErrorTechnical(err: FiberRpcError): string {
  if (err.kind === "rpc") {
    return JSON.stringify(
      {
        code: err.code ?? null,
        message: err.message,
        data: err.data ?? null,
      },
      null,
      2,
    );
  }
  return err.message;
}

export class FiberRpcCallError extends Error {
  readonly rpc: FiberRpcError;

  constructor(rpc: FiberRpcError) {
    super(rpc.message);
    this.name = "FiberRpcCallError";
    this.rpc = rpc;
  }
}
