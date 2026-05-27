/** Build Fiber `connect_peer` RPC params from address and pubkey fields. */
export function buildConnectPeerParams(
  address: string,
  pubkey: string
): object[] {
  const addr = address.trim();
  const pk = pubkey.trim();
  if (addr.startsWith("/")) {
    return pk ? [{ pubkey: pk, address: addr }] : [{ address: addr }];
  }
  if (addr) {
    return [{ pubkey: addr }];
  }
  if (pk) {
    return [{ pubkey: pk }];
  }
  return [];
}
