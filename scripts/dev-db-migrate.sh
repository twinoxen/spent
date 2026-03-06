#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL must be set (or set STORAGE_DATABASE_URL).}"

npm run db:migrate
