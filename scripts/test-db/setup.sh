#!/usr/bin/env bash
# One-time (idempotent) setup of a disposable local Postgres + PostgREST instance
# for integration tests. See openspec/changes/add-shared-backend/tasks.md section 6.
#
# Requires: `brew install postgresql@17 postgrest`
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PG_DATA="$ROOT/.local-pg/data"
PG_PORT=54329
PGREST_PORT=54322
PROXY_PORT=54321
DB_NAME=expense_tracker_test

export PATH="/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/bin:$PATH"

if [ ! -d "$PG_DATA" ]; then
  echo "Initializing local Postgres data directory..."
  initdb -D "$PG_DATA" --username=postgres --auth=trust -E UTF8
  {
    echo "port = $PG_PORT"
    echo "listen_addresses = 'localhost'"
  } >> "$PG_DATA/postgresql.conf"
fi

echo "Starting Postgres..."
pg_ctl -D "$PG_DATA" -l "$ROOT/.local-pg/logfile" -o "-p $PG_PORT" start || true
sleep 1

export PGHOST=localhost PGPORT=$PG_PORT PGUSER=postgres

if ! psql -lqt | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
  echo "Creating database $DB_NAME..."
  psql -d postgres -c "select 1 from pg_roles where rolname = 'anon'" -tA | grep -q 1 || \
    psql -d postgres -c "create role anon nologin;"
  psql -d postgres -c "select 1 from pg_roles where rolname = 'authenticated'" -tA | grep -q 1 || \
    psql -d postgres -c "create role authenticated nologin;"
  psql -d postgres -c "select 1 from pg_roles where rolname = 'authenticator'" -tA | grep -q 1 || \
    psql -d postgres -c "create role authenticator noinherit login password 'localtest';"
  psql -d postgres -c "grant anon to authenticator;" || true
  psql -d postgres -c "grant authenticated to authenticator;" || true

  createdb "$DB_NAME"
  psql -d "$DB_NAME" -f "$ROOT/supabase/migrations/0001_init.sql"
  psql -d "$DB_NAME" -c "grant usage on schema public to anon, authenticated;"
  psql -d "$DB_NAME" -c "grant all on all tables in schema public to anon, authenticated;"
  psql -d "$DB_NAME" -c "grant all on all sequences in schema public to anon, authenticated;"
fi

cat > "$ROOT/.local-pg/postgrest.conf" <<EOF
db-uri = "postgres://authenticator:localtest@localhost:$PG_PORT/$DB_NAME"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$(cat "$ROOT/scripts/test-db/jwt-secret.txt")"
server-host = "127.0.0.1"
server-port = $PGREST_PORT
EOF

echo "Starting PostgREST..."
pkill -f "postgrest .*\.local-pg/postgrest.conf" 2>/dev/null || true
sleep 0.5
/opt/homebrew/opt/postgrest/bin/postgrest "$ROOT/.local-pg/postgrest.conf" > "$ROOT/.local-pg/postgrest.log" 2>&1 &
disown

echo "Starting rest-proxy (adds the /rest/v1 prefix supabase-js expects)..."
pkill -f "rest-proxy.mjs $PROXY_PORT" 2>/dev/null || true
sleep 0.5
node "$ROOT/scripts/test-db/rest-proxy.mjs" "$PROXY_PORT" "$PGREST_PORT" > "$ROOT/.local-pg/rest-proxy.log" 2>&1 &
disown

sleep 1
echo "Ready: Postgres on :$PG_PORT, PostgREST on :$PGREST_PORT, proxy (use this) on :$PROXY_PORT (db: $DB_NAME)"
