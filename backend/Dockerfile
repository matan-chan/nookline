FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx prisma generate

FROM builder AS test
WORKDIR /app
RUN bun test

FROM oven/bun:1
RUN apt-get update && apt-get install -y --no-install-recommends curl poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
EXPOSE 4000
CMD ["sh", "-c", "bunx prisma migrate deploy && exec bun run src/index.ts"]
