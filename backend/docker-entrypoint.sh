#!/bin/sh
set -e

if [ -n "${JWT_SECRET:-}" ] || [ -n "${AUTH_SECRET:-}" ]; then
  exec "$@"
fi

SECRET_FILE="${JWT_SECRET_FILE:-/data/.jwt_secret}"
if [ -f "$SECRET_FILE" ]; then
  export JWT_SECRET="$(tr -d '\r\n' <"$SECRET_FILE")"
else
  mkdir -p "$(dirname "$SECRET_FILE")"
  export JWT_SECRET="$(bun -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
  printf '%s' "$JWT_SECRET" >"$SECRET_FILE"
  chmod 600 "$SECRET_FILE" 2>/dev/null || true
  echo "nookline: generated JWT_SECRET and wrote $SECRET_FILE (persists on this volume)" >&2
fi

exec "$@"
