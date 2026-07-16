#!/usr/bin/env bash
# Idempotent Codespace bootstrap: runs on every start (postStartCommand).
# Starts PostgreSQL, creates the game role/database if needed, installs
# dependencies, applies migrations and seeds the world map.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v psql >/dev/null 2>&1; then
  echo "[setup] PostgreSQL is not installed - installing (this takes a minute)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql
fi

echo "[setup] Starting PostgreSQL..."
sudo service postgresql start

echo "[setup] Ensuring role and database exist..."
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='swo'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE swo LOGIN PASSWORD 'swo';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='swo'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE swo OWNER swo;"

echo "[setup] Server dependencies + schema..."
cd server
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
npm run migrate
npm run seed
cd ..

echo "[setup] Client dependencies..."
cd client
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
cd ..

echo "[setup] Done. Start the game with:"
echo "  terminal 1:  cd server && npm run dev"
echo "  terminal 2:  cd client && npm run dev"
