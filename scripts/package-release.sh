#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/build"
VERSION="$(python3 -c 'import json, pathlib; print(json.loads(pathlib.Path(__import__("sys").argv[1]).read_text())["version"])' "$ROOT_DIR/manifest.json")"

rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR/chrome" "$BUILD_DIR/firefox"

copy_common_files() {
  local target="$1"
  mkdir -p "$target/src" "$target/icons"
  cp "$ROOT_DIR/src/"*.js "$target/src/"
  cp "$ROOT_DIR/icons/"*.png "$target/icons/"
}

copy_common_files "$BUILD_DIR/chrome"
cp "$ROOT_DIR/manifest.json" "$BUILD_DIR/chrome/manifest.json"

copy_common_files "$BUILD_DIR/firefox"
cp "$ROOT_DIR/manifest.firefox.json" "$BUILD_DIR/firefox/manifest.json"

(
  cd "$BUILD_DIR/chrome"
  zip -qr "$DIST_DIR/texwaller-ai-connector-chrome-v$VERSION.zip" .
)

(
  cd "$BUILD_DIR/firefox"
  zip -qr "$DIST_DIR/texwaller-ai-connector-firefox-v$VERSION.zip" .
)

echo "Created release packages in $DIST_DIR"
