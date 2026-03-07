#!/usr/bin/env bash
set -euo pipefail

# shellcheck disable=SC1091
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

POSTGRES_READY_TIMEOUT_SECONDS="${POSTGRES_READY_TIMEOUT_SECONDS:-90}"

wait_for_postgres_health() {
  local timeout_seconds="$1"
  local start_ts now container_id status

  start_ts="$(date +%s)"

  # Wait for the container to exist and become inspectable.
  while true; do
    container_id="$(docker compose ps -q postgres 2>/dev/null || true)"
    if [[ -n "${container_id}" ]]; then
      break
    fi

    now="$(date +%s)"
    if (( now - start_ts >= timeout_seconds )); then
      echo "Timed out waiting for postgres container to be created (${timeout_seconds}s)." >&2
      return 1
    fi
    sleep 1
  done

  echo "Waiting for postgres healthcheck (timeout: ${timeout_seconds}s)..."
  while true; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"

    if [[ "${status}" == "healthy" ]]; then
      echo "Postgres is healthy."
      return 0
    fi

    if [[ "${status}" == "unhealthy" || "${status}" == "exited" || "${status}" == "dead" ]]; then
      echo "Postgres did not become healthy (status: ${status})." >&2
      return 1
    fi

    now="$(date +%s)"
    if (( now - start_ts >= timeout_seconds )); then
      echo "Timed out waiting for postgres to become healthy (${timeout_seconds}s)." >&2
      return 1
    fi

    sleep 1
  done
}

# Prefer native compose wait behavior when available.
if docker compose up --help 2>/dev/null | grep -q -- '--wait'; then
  docker compose up -d --wait postgres
  echo "Postgres is healthy."
else
  docker compose up -d postgres
  wait_for_postgres_health "${POSTGRES_READY_TIMEOUT_SECONDS}"
fi
