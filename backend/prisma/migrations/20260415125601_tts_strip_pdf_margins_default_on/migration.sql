-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ttsMode" TEXT NOT NULL DEFAULT 'kokoro',
    "ttsCustomBaseUrl" TEXT,
    "ttsCustomApiKey" TEXT,
    "ttsVoice" TEXT NOT NULL DEFAULT 'af_heart',
    "ttsModel" TEXT NOT NULL DEFAULT 'kokoro',
    "ttsSpeed" REAL NOT NULL DEFAULT 1.0,
    "ttsPitch" REAL NOT NULL DEFAULT 1.0,
    "ttsChunkMinChars" INTEGER NOT NULL DEFAULT 200,
    "ttsChunkMaxChars" INTEGER NOT NULL DEFAULT 300,
    "ttsChunkPeriodExtra" INTEGER NOT NULL DEFAULT 1500,
    "ttsReaderShowPage" BOOLEAN NOT NULL DEFAULT true,
    "ttsReaderShowTitle" BOOLEAN NOT NULL DEFAULT true,
    "ttsReaderStripPdfMargins" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isAdmin", "password", "ttsChunkMaxChars", "ttsChunkMinChars", "ttsChunkPeriodExtra", "ttsCustomApiKey", "ttsCustomBaseUrl", "ttsMode", "ttsModel", "ttsPitch", "ttsReaderShowPage", "ttsReaderShowTitle", "ttsReaderStripPdfMargins", "ttsSpeed", "ttsVoice", "updatedAt", "username") SELECT "createdAt", "email", "id", "isAdmin", "password", "ttsChunkMaxChars", "ttsChunkMinChars", "ttsChunkPeriodExtra", "ttsCustomApiKey", "ttsCustomBaseUrl", "ttsMode", "ttsModel", "ttsPitch", "ttsReaderShowPage", "ttsReaderShowTitle", "ttsReaderStripPdfMargins", "ttsSpeed", "ttsVoice", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
UPDATE "User" SET "ttsReaderStripPdfMargins" = 1;
