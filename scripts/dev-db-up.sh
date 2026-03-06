#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

docker compose up -d postgres

echo "Waiting for postgres healthcheck..."
until docker compose ps --format json 2>/dev/null | grep -q '"Health":"healthy"'; do
  sleep 1
done

echo "Postgres is healthy."
