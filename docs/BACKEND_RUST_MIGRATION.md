# Backend Rust migration

## Scope of the current Bun backend

| Area | Location | Rust notes |
|------|----------|------------|
| HTTP boot, health | `src/index.ts` | Done in scaffold |
| GraphQL (Apollo) | `src/graphql/**` | `async-graphql` + schema port; largest piece |
| Auth JWT + passwords | `src/auth/**`, `routes/auth/**` | HMAC JWT + scrypt (Bun-compatible) |
| Prisma / SQLite | `prisma/schema.prisma` | `sqlx` + SQL migrations from schema |
| File routes | `src/routes/files/**` | Axum multipart, streaming |
| TTS proxy | `src/routes/tts.ts` | `reqwest` to Kokoro |
| PDF / covers | `src/services/pdf/**`, sharp, pdfjs | Keep as subprocess or Rust crates (`pdf`, `image`) |
| EPUB / Calibre | `services/epub/**` | `std::process::Command` to `ebook-convert` |
| Open Library | `services/openLibrary/**` | `reqwest` |
| Library disk sync | `services/library/**` | Port logic verbatim first |

Roughly **83** TypeScript modules under `backend/src` plus **25** test files — full parity is a **multi-phase** project, not a single release.

## Suggested phases

1. **Observability + perf harness** — `backend/benchmarks/*` (done); keep reports per release.
2. **Scaffold** — `backend-rust` health + gql stub (done).
3. **Data layer** — SQLx on existing SQLite; `Library` / `Series` / `Book` rows (done).
4. **GraphQL read path** — all **26** schema queries wired; recommendations scored + fallback; `ttsEngineProbe` synthesis probe; Book field resolvers match Bun (`readingProgressForUser` / `isFavoriteForUser` return null/false when `userId` mismatch).
5. **Auth REST** — `/api/auth/*` including admin users, bootstrap, e2e-token, scrypt + legacy plaintext migration (done).
6. **Mutations** — all **22** schema mutations wired; `deleteLibrary` / `deleteSeries` unlink book artifacts + child rows; `resetAppCustomization` clears banner/favicon files on disk; books create/delete + post-create/enrich pipelines (local fallback, PDF margins, pdf→epub queue); OL enrich + series attach; customization/TTS/voice profiles.
7. **Files (REST)** — `/api/files/*` at Bun parity: stream, covers (+ OL fallback + raw MIME on optimize miss), avatar, branding, upload (+ PDF embedded meta), upload-preview, JSON `/health`.
8. **TTS** — `/api/tts/speech`, `/voices` proxy (done).
9. **Startup** — legacy admin seed, `AppCustomization` row (done).
10. **Docker / ops** — production `Dockerfile` (repo root context), `docker-entrypoint.sh`, image `HEALTHCHECK`, GHCR publish, `backend-rust-ci.yml` (fmt, clippy `-D warnings`, `cargo test`, release build, docker build smoke), expanded `scripts/smoke.sh` (auth + GQL `me`). Local `docker-compose.yml` builds Rust backend. See [BACKEND_RUST_CUTOVER.md](./BACKEND_RUST_CUTOVER.md).

### Parity snapshot (approx.)

| Surface | Bun | Rust |
|---------|-----|------|
| REST auth | 7 routes + admin | same (+ avatar unlink on admin delete) |
| REST files | ~15 handlers | same (Bun parity) |
| REST TTS | 2 | same (+ upstream connection hints; voices error status/text) |
| REST health | `/api/health`, `/api/files/health` | same shape |
| GQL queries | ~26 | **26** (schema names wired) |
| GQL mutations | ~22 | **22** (schema names wired) |
| Services (PDF/sync/OL) | full | OL enrich + series attach; local fallback (filename/pdfinfo/pdftotext); derived covers; margin regex via pdftotext; pdf→epub queue (`ebook-convert`); library folder rm on delete; cover cache cleanup on book delete |

## Acceptance for “replace Bun in production”

- Rust: `cargo test --all-targets` (**~78** cases, 1 ignored): Bun `backend/test` parity including pdf-lib margin fixtures (`tests/fixtures/*.pdf`, regen `bun backend/scripts/gen_margin_fixtures.mjs`), comedy paths, derived cover, gql public, OL enrich (wiremock), cover webp (`pdftoppm` when installed), local cover webp serve (`cover_serve_local`).
- CI quality job installs **poppler-utils** so margin-regex fixture tests run on Ubuntu.
- Perf: `cargo run --release --bin nookline-perf -- --base-url URL --out report.json` emits JSON for `backend/benchmarks/compareReports.ts` (`bun run perf:compare`). CI smoke job writes `tmp/perf-rust-ci.json`.
- **A/B perf** (local): `powershell backend-rust/scripts/perf-compare-ab.ps1` or Linux/CI `bash backend-rust/scripts/perf-compare-ab.sh` — Bun harness + PID RSS sampling; `bun run perf:gate` fails if Rust p95 regresses >5% vs Bun.
- Measured on Win11 (release Rust, Bun 1.3.6, 100 iter, same SQLite): **p95 latency −78% to −84%**; **mean RSS ~606 MB (Bun) vs ~6.3 MB (Rust)** (~**99%** less working set in this harness).
- Remaining intentional gaps: optional **Behavior Ops** PDF (`#[ignore]`), pixel-identical covers (sharp vs poppler).
- `perf:compare` shows Rust **≤** Bun p95 on core scenarios at equal load, or documented tradeoff.
- Same SQLite file + migrations compatible with existing `/data` volume.
- GHCR image builds and passes health + smoke GraphQL.

## Non-goals (until parity)

- Rewriting frontend or changing API shapes.
- Dropping Calibre/poppler where the TS backend still shells out to them.