-- CreateTable
CREATE TABLE "AppCustomization" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "siteName" TEXT,
    "faviconRelPath" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomLibraryBanner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "relPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Library" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NOVEL',
    "bannerIndex" INTEGER NOT NULL DEFAULT 0,
    "customLibraryBannerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Library_customLibraryBannerId_fkey" FOREIGN KEY ("customLibraryBannerId") REFERENCES "CustomLibraryBanner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Library" ("bannerIndex", "createdAt", "id", "name", "path", "type", "updatedAt") SELECT "bannerIndex", "createdAt", "id", "name", "path", "type", "updatedAt" FROM "Library";
DROP TABLE "Library";
ALTER TABLE "new_Library" RENAME TO "Library";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isAdmin", "password", "ttsChunkMaxChars", "ttsChunkMinChars", "ttsChunkPeriodExtra", "ttsCustomApiKey", "ttsCustomBaseUrl", "ttsMode", "ttsModel", "ttsPitch", "ttsReaderShowPage", "ttsReaderShowTitle", "ttsSpeed", "ttsVoice", "updatedAt", "username") SELECT "createdAt", "email", "id", "isAdmin", "password", "ttsChunkMaxChars", "ttsChunkMinChars", "ttsChunkPeriodExtra", "ttsCustomApiKey", "ttsCustomBaseUrl", "ttsMode", "ttsModel", "ttsPitch", "ttsReaderShowPage", "ttsReaderShowTitle", "ttsSpeed", "ttsVoice", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "BookFavorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookFavorite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BookFavorite_userId_bookId_key" ON "BookFavorite"("userId", "bookId");
