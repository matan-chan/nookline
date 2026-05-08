-- Add global setting: convert PDF uploads to EPUB
ALTER TABLE "AppCustomization" ADD COLUMN "convertPdfToEpub" BOOLEAN NOT NULL DEFAULT false;

