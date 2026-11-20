# Backend Rust — production cutover

> **2026-03:** Rust code lives in `backend/` only (`backend-rust/` and the Bun TypeScript API were removed). Use `backend/Dockerfile` and `.github/workflows/backend-ci.yml`.

## Gates (must pass)

| Gate | Command / workflow |
|------|-------------------|
| Format | `cargo fmt --all -- --check` (`backend-ci.yml`) |
| Clippy | `cargo clippy --all-targets -- -D warnings` |
| Unit + HTTP integration tests | `cargo test --all-targets` (`tests/http_smoke.rs` + module tests) |
| Release build | `cargo build --release` |
| Smoke (health + auth + GQL + files health) | `SMOKE_BASE_URL=… bash backend/scripts/smoke.sh` |
| Docker build + container smoke | `backend-ci.yml` job `docker-build` |
| GHCR publish | `.github/workflows/docker-publish.yml` → `ghcr.io/<owner>/nookline-backend` |
| Trivy CRITICAL scan (fail on CRITICAL) | `docker-publish.yml` `scan-images` (`exit-code: 1`) |
| Perf (optional) | `cargo run --release --bin nookline-perf` |

## Runtime (Docker / compose)

- **Image**: Rust binary; `backend/docker-entrypoint.sh` (JWT volume behavior `/data/.jwt_secret`).
- **DB**: `DATABASE_URL` default `file:/data/app.db`; **Prisma migrate deploy** on container start (schema from `backend/prisma`).
- **Books**: `UPLOAD_DIR=/books` (compose volume).
- **Deps in image**: `poppler-utils`, Calibre `ebook-convert`, `curl` (healthcheck).

## Local smoke

```bash
cd backend
$env:DATABASE_URL="file:./prisma/dev.db"
$env:JWT_SECRET="local-dev-only-replace-with-a-long-random-secret-at-least-32"
cargo run --release
# other shell:
$env:SMOKE_BASE_URL="http://127.0.0.1:4000"
bash backend/scripts/smoke.sh
```