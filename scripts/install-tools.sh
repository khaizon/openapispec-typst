#!/usr/bin/env bash
# Install the optional Typst developer tools used by this repo:
#   typstyle  - canonical Typst formatter (make fmt)
#   tinymist  - Typst language server / preview server for editors
#
# Both are single static binaries from GitHub releases; no Rust toolchain is
# needed. Pin versions with TYPOSTYLE_VERSION / TINYMIST_VERSION, e.g.
#   TYPOSTYLE_VERSION=v0.13.11 ./scripts/install-tools.sh
set -euo pipefail

BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
mkdir -p "$BIN_DIR"

machine="$(uname -m)"
case "$machine" in
  x86_64|amd64) target="x86_64-unknown-linux-gnu" ;;
  aarch64|arm64) target="aarch64-unknown-linux-gnu" ;;
  *) echo "unsupported architecture: $machine" >&2; exit 1 ;;
esac

latest_tag() {
  curl -fsSL "https://api.github.com/repos/$1/releases/latest" |
    sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1
}

install_typstyle() {
  local version="${TYPOSTYLE_VERSION:-}"
  [ -n "$version" ] || version="$(latest_tag Enter-tainer/typstyle)"
  # typstyle publishes bare binaries (no tarball) for the gnu targets.
  local url="https://github.com/Enter-tainer/typstyle/releases/download/${version}/typstyle-${target}"
  echo "==> typstyle $version ($target)"
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "$url" -o "$tmp/typstyle"
  install -m 0755 "$tmp/typstyle" "$BIN_DIR/typstyle"
  rm -rf "$tmp"
}

install_tinymist() {
  local version="${TINYMIST_VERSION:-}"
  [ -n "$version" ] || version="$(latest_tag Myriad-Dreamin/tinymist)"
  local url="https://github.com/Myriad-Dreamin/tinymist/releases/download/${version}/tinymist-${target}.tar.gz"
  echo "==> tinymist $version ($target)"
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "$url" | tar -xz -C "$tmp"
  install -m 0755 "$tmp/tinymist-${target}/tinymist" "$BIN_DIR/tinymist"
  rm -rf "$tmp"
}

WANT="${*:-typstyle tinymist}"
for tool in $WANT; do
  case "$tool" in
    typstyle) install_typstyle ;;
    tinymist) install_tinymist ;;
    *) echo "unknown tool: $tool" >&2; exit 1 ;;
  esac
done

echo "==> installed into $BIN_DIR (ensure it is on PATH)"
"$BIN_DIR/typstyle" --version 2>/dev/null || true
"$BIN_DIR/tinymist" --version 2>/dev/null | head -n1 || true
