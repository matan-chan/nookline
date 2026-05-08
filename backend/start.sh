#!/bin/sh
set -e

bunx prisma@5.22.0 migrate deploy
exec bun run src/index.ts

