FROM oven/bun:1.2.23-debian AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .

FROM node:22-bookworm-slim AS prisma-gen
WORKDIR /app
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
ENV DATABASE_URL=file:/tmp/nookline-build.db
RUN npm i --no-save prisma@5.22.0 && npx prisma generate

FROM oven/bun:1.2.23-debian AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl poppler-utils calibre && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN groupadd -r app && useradd -r -g app -d /app app
ENV XDG_CONFIG_HOME=/tmp/.config
RUN mkdir -p /tmp/.config && chown -R app:app /tmp/.config
RUN mkdir -p /data && chown app:app /data
COPY --chown=app:app --from=builder /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --chown=app:app --from=prisma-gen /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=app:app --from=prisma-gen /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=app:app --from=builder /app/prisma ./prisma
COPY --chown=app:app --from=builder /app/src ./src
COPY start.sh /start.sh
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh /start.sh
EXPOSE 4000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/start.sh"]
