#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"
pkill -f "postgrest .*\.local-pg/postgrest.conf" 2>/dev/null || true
pkill -f "rest-proxy.mjs" 2>/dev/null || true
pg_ctl -D "$ROOT/.local-pg/data" stop -m fast 2>/dev/null || true
echo "Stopped."
