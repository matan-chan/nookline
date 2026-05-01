-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarRelPath" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Library" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NOVEL',
    "bannerIndex" INTEGER NOT NULL DEFAULT 0,
    "customLibraryBannerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Library_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Library_customLibraryBannerId_fkey" FOREIGN KEY ("customLibraryBannerId") REFERENCES "CustomLibraryBanner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Library" ("bannerIndex", "createdAt", "customLibraryBannerId", "id", "name", "path", "type", "updatedAt") SELECT "bannerIndex", "createdAt", "customLibraryBannerId", "id", "name", "path", "type", "updatedAt" FROM "Library";
DROP TABLE "Library";
ALTER TABLE "new_Library" RENAME TO "Library";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
