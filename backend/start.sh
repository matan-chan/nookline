#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f /.dockerenv ] && [ -d /data ]; then
    export DATABASE_URL="file:/data/app.db"
  else
    export DATABASE_URL="file:${PWD}/prisma/dev.db"
  fi
fi

bunx prisma@5.22.0 migrate deploy
exec bun run src/index.ts

