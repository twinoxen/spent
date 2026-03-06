#!/usr/bin/env bash
set -euo pipefail

docker compose down -v

scripts/dev-db-up.sh

echo "Local postgres reset complete (volume recreated, postgres healthy)."
