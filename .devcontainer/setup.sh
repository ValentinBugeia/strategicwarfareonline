#!/usr/bin/env bash
# Idempotent Codespace bootstrap: runs on every start (postStartCommand).
# Starts PostgreSQL, creates the game role/database if needed, installs
# dependencies, applies migrations and seeds the world map.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v psql >/dev/null 2>&1; then
  echo "[setup] PostgreSQL is not installed - installing (this takes a minute)..."
  # Codespace images sometimes ship third-party apt sources with expired
  # GPG keys (e.g. dl.yarnpkg.com); a partial index refresh is fine as
  # long as the main Ubuntu repositories - where postgresql lives - work.
  sudo apt-get update -qq || echo "[setup] warning: some apt repositories failed to refresh (ignored)"
  sudo apt-get install -y -qq postgresql
fi

echo "[setup] Starting PostgreSQL..."
sudo service postgresql start

echo "[setup] Ensuring role and database exist..."
# Go through root (`sudo su postgres`) rather than `sudo -u postgres`:
# some Codespace images only allow passwordless sudo to root, and
# switching to any other user prompts for a password that doesn't exist.
sudo su postgres -c "psql -v ON_ERROR_STOP=1" <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'swo') THEN
    CREATE ROLE swo LOGIN PASSWORD 'swo';
  END IF;
END $$;
SELECT 'CREATE DATABASE swo OWNER swo'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swo')\gexec
SQL

echo "[setup] Root dependencies (concurrently for 'npm run dev')..."
npm install

echo "[setup] Server dependencies + schema..."
cd server
[ -f .env ] || cp .env.example .env
npm install
npm run migrate
npm run seed
cd ..

echo "[setup] Client dependencies..."
cd client
[ -f .env ] || cp .env.example .env
npm install
cd ..

echo "[setup] Done. Start the game with a single command from the project root:"
echo "  npm run dev"
