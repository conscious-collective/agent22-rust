#!/usr/bin/env bash
# Downloads the OpenFang binary for the current platform and places it in
# src-tauri/binaries/ using Tauri's sidecar naming convention.
set -euo pipefail

REPO="RightNow-AI/openfang"
BINARIES_DIR="$(cd "$(dirname "$0")/../src-tauri/binaries" && pwd)"

# Detect target triple
TARGET="$(rustc -vV 2>/dev/null | grep '^host:' | awk '{print $2}')"
if [ -z "$TARGET" ]; then
  echo "Error: could not determine Rust target triple (is rustc installed?)" >&2
  exit 1
fi

DEST="$BINARIES_DIR/openfang-$TARGET"

# Already exists — skip unless --force
if [ -f "$DEST" ] && [ "${1:-}" != "--force" ]; then
  echo "✓ Sidecar already present: $DEST"
  exit 0
fi

echo "→ Target: $TARGET"

# Resolve the release asset name for this platform
case "$TARGET" in
  aarch64-apple-darwin)    ASSET="openfang-aarch64-apple-darwin.tar.gz" ;;
  x86_64-apple-darwin)     ASSET="openfang-x86_64-apple-darwin.tar.gz" ;;
  aarch64-unknown-linux-*)  ASSET="openfang-aarch64-unknown-linux-gnu.tar.gz" ;;
  x86_64-unknown-linux-*)   ASSET="openfang-x86_64-unknown-linux-gnu.tar.gz" ;;
  x86_64-pc-windows-*)      ASSET="openfang-x86_64-pc-windows-msvc.zip" ;;
  aarch64-pc-windows-*)     ASSET="openfang-aarch64-pc-windows-msvc.zip" ;;
  *)
    echo "Error: unsupported target '$TARGET'" >&2
    echo "Supported: aarch64/x86_64-apple-darwin, aarch64/x86_64-unknown-linux-gnu, x86_64/aarch64-pc-windows-msvc" >&2
    exit 1
    ;;
esac

# Fetch latest release tag
echo "→ Fetching latest release info..."
LATEST_URL="https://api.github.com/repos/$REPO/releases/latest"
if command -v curl &>/dev/null; then
  RELEASE_JSON="$(curl -fsSL "$LATEST_URL")"
elif command -v wget &>/dev/null; then
  RELEASE_JSON="$(wget -qO- "$LATEST_URL")"
else
  echo "Error: curl or wget required" >&2; exit 1
fi

TAG="$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$ASSET"

echo "→ Downloading $ASSET ($TAG)..."
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

if command -v curl &>/dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMPDIR/$ASSET"
else
  wget -qO "$TMPDIR/$ASSET" "$DOWNLOAD_URL"
fi

# Extract binary
echo "→ Extracting..."
case "$ASSET" in
  *.tar.gz)
    tar -xzf "$TMPDIR/$ASSET" -C "$TMPDIR"
    BINARY="$(find "$TMPDIR" -maxdepth 2 -type f -name "openfang" | head -1)"
    ;;
  *.zip)
    unzip -q "$TMPDIR/$ASSET" -d "$TMPDIR/extracted"
    BINARY="$(find "$TMPDIR/extracted" -maxdepth 2 -type f \( -name "openfang" -o -name "openfang.exe" \) | head -1)"
    ;;
esac

if [ -z "$BINARY" ] || [ ! -f "$BINARY" ]; then
  echo "Error: could not find openfang binary in archive" >&2
  exit 1
fi

cp "$BINARY" "$DEST"
chmod +x "$DEST"

# macOS: strip Gatekeeper quarantine so the binary can run without a security prompt
if [[ "$(uname)" == "Darwin" ]]; then
  xattr -cr "$DEST" 2>/dev/null || true
fi

echo "✓ Installed sidecar: $DEST"
