#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R app:app /data 2>/dev/null || true
  mkdir -p /books 2>/dev/null || true
  chown -R app:app /books 2>/dev/null ||
    echo "nookline: could not chown /books; ensure volume writable by app user" >&2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f /.dockerenv ] && [ -d /data ]; then
    export DATABASE_URL="file:/data/app.db"
  fi
fi

export UPLOAD_DIR="${UPLOAD_DIR:-/books}"

if [ -n "${JWT_SECRET:-}" ] || [ -n "${AUTH_SECRET:-}" ]; then
  :
elif [ -f "${JWT_SECRET_FILE:-/data/.jwt_secret}" ]; then
  export JWT_SECRET="$(tr -d '\r\n' <"${JWT_SECRET_FILE}")"
else
  SECRET_FILE="${JWT_SECRET_FILE:-/data/.jwt_secret}"
  mkdir -p "$(dirname "$SECRET_FILE")"
  export JWT_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  printf '%s' "$JWT_SECRET" >"$SECRET_FILE"
  chmod 600 "$SECRET_FILE" 2>/dev/null || true
  echo "nookline: generated JWT_SECRET and wrote $SECRET_FILE" >&2
fi

if [ -n "${DATABASE_URL:-}" ] && [ -d /app/prisma/migrations ]; then
  if command -v prisma >/dev/null 2>&1; then
    prisma migrate deploy --schema=/app/prisma/schema.prisma
  fi
fi

if [ "$(id -u)" = "0" ]; then
  exec su app -s /bin/sh -c "$*"
fi
exec "$@"