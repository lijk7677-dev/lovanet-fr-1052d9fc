#!/bin/bash
set -euo pipefail

# Create a reproducible backup snapshot without interactive prompts.
ROOT_DIR="/app"
cd "$ROOT_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
BK="backups/after-quality-fixes-${TS}"
LOCK_FILE="/tmp/lovanet-backup.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Backup already running. Try again in a moment."
  exit 1
fi

mkdir -p "$BK"

git rev-parse --short HEAD > "$BK/git-head.txt"
git status --short > "$BK/git-status.txt"

tar -czf "$BK/workspace.tar.gz" \
  frontend \
  backend \
  git-update-stabilizer.sh \
  lovanet-stabilizer.json \
  README.md \
  tests 2>/dev/null

echo "Backup created: $BK"
ls -lh "$BK"
