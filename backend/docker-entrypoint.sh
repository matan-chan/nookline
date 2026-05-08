#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R app:app /data 2>/dev/null || true
  if [ -n "${UPLOAD_DIR:-}" ]; then
    mkdir -p "${UPLOAD_DIR}" 2>/dev/null || true
    chown -R app:app "${UPLOAD_DIR}" 2>/dev/null ||
      echo "nookline: could not chown UPLOAD_DIR=${UPLOAD_DIR}; set volume fsGroup writable by UID $(id -u app 2>/dev/null || echo app) or run as root" >&2
  fi
fi

if [ -n "${JWT_SECRET:-}" ] || [ -n "${AUTH_SECRET:-}" ]; then
  if [ "$(id -u)" = "0" ]; then
    exec su app -s /bin/sh -c "$*"
  fi
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

if [ "$(id -u)" = "0" ]; then
  exec su app -s /bin/sh -c "$*"
fi
exec "$@"
