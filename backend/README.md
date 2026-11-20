# Nookline backend (Rust)

Axum + SQLx + async-graphql API. Prisma schema and SQLite migrations live in `prisma/`.

## Run (dev)

```bash
cd backend
# PowerShell:
$env:DATABASE_URL="file:./prisma/dev.db"
$env:JWT_SECRET="local-dev-only-replace-with-a-long-random-secret-at-least-32"
cargo run
```

## Quality

```bash
cargo fmt --all
cargo clippy --all-targets -- -D warnings
cargo test --all-targets
cargo build --release
```

Smoke (server must be up):

```bash
SMOKE_BASE_URL=http://127.0.0.1:4000 bash scripts/smoke.sh
```

CI: `.github/workflows/backend-ci.yml`.

## Docker

From repo root:

```bash
docker build -f backend/Dockerfile .
```

## Perf

```bash
cargo run --release --bin nookline-perf -- --base-url http://127.0.0.1:4000 --label local
```