#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

: "${STORAGE_DATABASE_URL:?STORAGE_DATABASE_URL must be set.}"

npm run db:migrate
