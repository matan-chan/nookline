-- Deduplicate any existing duplicate book rows (keep lowest id)
DELETE FROM "Book"
WHERE "id" NOT IN (
  SELECT MIN("id")
  FROM "Book"
  GROUP BY "libraryId", "filePath"
);

-- Enforce idempotent library sync
CREATE UNIQUE INDEX "Book_libraryId_filePath_key" ON "Book"("libraryId", "filePath");

