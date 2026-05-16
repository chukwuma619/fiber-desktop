#!/usr/bin/env bash
# Downloads pinned fnn for the host triple into src-tauri/binaries/ for Tauri externalBin.
# Keep TAG in sync with src-tauri/src/fnn_fetch.rs (PINNED_FNN_TAG).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="v0.8.1"
BIN_DIR="$ROOT/src-tauri/binaries"
mkdir -p "$BIN_DIR"
TRIPLE=$(rustc --print host-tuple)
STAMP_FILE="$BIN_DIR/.fnn-pinned-tag"

OUT_NAME="fnn-$TRIPLE"
if [[ "$TRIPLE" == *"windows"* ]]; then
  OUT_NAME="fnn-$TRIPLE.exe"
fi

if [[ -f "$STAMP_FILE" ]] && [[ "$(cat "$STAMP_FILE")" == "$TAG" ]] && [[ -f "$BIN_DIR/$OUT_NAME" ]]; then
  echo "fnn sidecar already present ($TAG, $TRIPLE)"
  exit 0
fi

case "$TRIPLE" in
  aarch64-apple-darwin) ASSET="fnn_${TAG}-aarch64-darwin-portable.tar.gz" ;;
  x86_64-apple-darwin) ASSET="fnn_${TAG}-x86_64-darwin-portable.tar.gz" ;;
  aarch64-unknown-linux-gnu) ASSET="fnn_${TAG}-aarch64-linux-portable.tar.gz" ;;
  x86_64-unknown-linux-gnu) ASSET="fnn_${TAG}-x86_64-linux-portable.tar.gz" ;;
  x86_64-pc-windows-msvc) ASSET="fnn_${TAG}-x86_64-windows.tar.gz" ;;
  *)
    echo "Unsupported rustc host triple for fnn sidecar: $TRIPLE"
    exit 1
    ;;
esac

URL="https://github.com/nervosnetwork/fiber/releases/download/${TAG}/${ASSET}"
TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Downloading $URL ..."
ARCHIVE="$TMP/archive.tar.gz"
for attempt in 1 2 3; do
  if curl -fsSL --http1.1 --connect-timeout 30 --retry 3 --retry-delay 2 \
    "$URL" -o "$ARCHIVE"; then
    break
  fi
  echo "Download attempt $attempt failed, retrying..."
  rm -f "$ARCHIVE"
  if [[ "$attempt" -eq 3 ]]; then
    echo "curl failed after 3 attempts (try again or check network / GitHub availability)"
    exit 1
  fi
  sleep 3
done
tar -xzf "$ARCHIVE" -C "$TMP"
FOUND="$(find "$TMP" \( -name fnn -o -name fnn.exe \) -type f 2>/dev/null | head -1 || true)"
if [[ -z "$FOUND" ]]; then
  echo "Could not find fnn or fnn.exe inside archive"
  exit 1
fi

shopt -s nullglob
for f in "$BIN_DIR"/fnn-*; do
  [[ -f "$f" ]] && rm -f "$f"
done
shopt -u nullglob

DEST="$BIN_DIR/$OUT_NAME"
cp "$FOUND" "$DEST"
if [[ "$TRIPLE" != *"windows"* ]]; then
  chmod +x "$DEST"
fi
echo "$TAG" > "$STAMP_FILE"
echo "Sidecar ready: $DEST"
