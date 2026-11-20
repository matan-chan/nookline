FROM rust:1.85-bookworm AS build
WORKDIR /build
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
RUN cargo build --release

FROM node:22-bookworm-slim AS prisma
WORKDIR /prisma
COPY backend/prisma ./prisma
RUN npm install --no-save prisma@5.22.0

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl poppler-utils calibre sqlite3 \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd -r app && useradd -r -g app -d /app -s /usr/sbin/nologin app
WORKDIR /app
COPY --from=build /build/target/release/nookline-backend /usr/local/bin/nookline-backend
COPY --from=prisma /prisma/prisma /app/prisma
COPY --from=prisma /prisma/node_modules/.bin/prisma /usr/local/bin/prisma
COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
    && mkdir -p /data /books \
    && chown -R app:app /app /data /books
ENV PORT=4000
ENV UPLOAD_DIR=/books
EXPOSE 4000
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:4000/api/health" | grep -q ok || exit 1
USER root
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nookline-backend"]