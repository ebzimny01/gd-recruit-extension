#!/usr/bin/env bash
# Packs the Chrome extension into a distributable zip file.
#
# Usage:
#   scripts/package-extension.sh              # writes gdrecruit_browser_extension.zip
#   scripts/package-extension.sh --versioned  # writes gdrecruit_browser_extension_v<version>.zip
#   scripts/package-extension.sh -o out.zip   # writes to a custom path

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Files/directories included in the packed extension.
INCLUDE_PATHS=(
  manifest.json
  background.js
  rules_1.json
  LICENSE
  content
  data
  icons
  lib
  modules
  popup
)

OUTPUT=""
VERSIONED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)
      OUTPUT="$2"
      shift 2
      ;;
    --versioned)
      VERSIONED=true
      shift
      ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$OUTPUT" ]]; then
  if [[ "$VERSIONED" == true ]]; then
    VERSION=$(node -pe "require('./manifest.json').version" 2>/dev/null || python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
    OUTPUT="gdrecruit_browser_extension_v${VERSION}.zip"
  else
    OUTPUT="gdrecruit_browser_extension.zip"
  fi
fi

# Verify every declared source path exists before touching the output file.
for path in "${INCLUDE_PATHS[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "Missing expected file/directory: $path" >&2
    exit 1
  fi
done

rm -f "$OUTPUT"

zip -r -q "$OUTPUT" "${INCLUDE_PATHS[@]}" \
  -x "*.DS_Store" \
  -x "**/__pycache__/*"

echo "Packed extension -> $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
