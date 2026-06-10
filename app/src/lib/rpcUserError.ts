import type { FiberRpcError } from "./fiberRpcError";

/** Map Fiber RPC errors to plain-language messages for end users. */
export function formatRpcUserError(
  method: string,
  err: FiberRpcError | string,
): string {
  const parsed =
    typeof err === "string"
      ? ({ kind: "rpc" as const, message: err } satisfies FiberRpcError)
      : err;
  const lower = parsed.message.toLowerCase();

  if (parsed.kind === "transport") {
    return "Could not reach your node. Start the node on the Node tab, then try again.";
  }

  if (parsed.kind === "config") {
    return "The node API URL is not set. Open Setup and enter your node API address.";
  }

  if (parsed.kind === "parse") {
    return "The node returned an unexpected response. Check that the node API URL points to your Fiber node.";
  }

  if (parsed.kind === "missing_result") {
    return "The node did not return a result. Try again in a few seconds.";
  }

  if (parsed.code === -32999 || lower.includes("unauthorized")) {
    return "The node rejected this request (unauthorized). Check RPC authentication in your node settings.";
  }

  if (method === "new_invoice") {
    if (lower.includes("amount") || lower.includes("u128")) {
      return "The invoice amount looks invalid. Enter a positive CKB amount (for example 1 or 100.5).";
    }
    if (lower.includes("channel") || lower.includes("route")) {
      return "Could not create the invoice. Make sure you have an open channel in the Ready state on the Channels tab.";
    }
    if (lower.includes("currency")) {
      return "The invoice currency does not match your network. Check that your node is on the same network (testnet or mainnet) as this app.";
    }
    return "Could not create the invoice. Check the amount, confirm your node is running, and try again.";
  }

  if (method === "get_invoice") {
    return "Could not refresh invoice status. Your node may still be syncing — try again shortly.";
  }

  if (method === "send_payment" || method === "get_payment") {
    if (lower.includes("invoice")) {
      return "The invoice string may be invalid or expired. Ask the payee for a new invoice.";
    }
    return "The payment could not be completed. Check the invoice and your channel balance, then try again.";
  }

  if (method === "connect_peer") {
    return "Could not connect to that peer. Check the address and public key, and confirm your node is running.";
  }

  if (method === "open_channel") {
    if (lower.includes("funding") || lower.includes("amount")) {
      return "The funding amount looks invalid. Enter a positive CKB amount large enough for your peer.";
    }
    return "Could not open the channel. Confirm the peer is reachable and try again.";
  }

  if (lower.includes("channel") && lower.includes("not")) {
    return "Your channel is not ready yet. Wait until it shows Ready on the Channels tab, then try again.";
  }

  if (parsed.message.trim()) {
    return parsed.message;
  }

  return "Something went wrong. Check that your node is running and try again. If the problem continues, open Advanced details in Activity for the technical message.";
}
