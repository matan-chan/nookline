# PDF test fixtures

Committed pdf-lib outputs for margin-strip integration tests.

Regenerate:

```bash
cd backend
npm install --no-save pdf-lib@1.17.1
node scripts/gen_margin_fixtures.mjs
```

Requires `poppler-utils` (`pdfinfo`, `pdftotext`) for `tests/pdf_margin_fixture.rs`.