import type { AppCustomization, CustomLibraryBanner, PrismaClient } from "@prisma/client";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { GqlContext } from "../../gqlContext";
import { requireGqlAdmin } from "../../gqlContext";
import { beLog } from "../../../utils/beLog";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");

const unlinkUploadRelPath = (relPath: string | null | undefined) => {
  if (relPath == null || relPath.length === 0) return;
  const abs = join(UPLOAD_DIR, relPath);
  try {
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    /* best-effort */
  }
};

const DEFAULT_SITE_NAME = "Nookline";
const SITE_NAME_MAX_LEN = 120;

const faviconUrlFromRow = (updatedAt: Date) => `/api/files/branding/favicon?v=${encodeURIComponent(updatedAt.toISOString())}`;

const resolveSiteName = (raw: string | null | undefined) => {
  const t = (raw ?? "").trim();
  if (t.length === 0) return DEFAULT_SITE_NAME;
  return t.length > SITE_NAME_MAX_LEN ? t.slice(0, SITE_NAME_MAX_LEN) : t;
};

const normalizeSiteNameForStorage = (raw: string) => {
  const t = raw.trim();
  if (t.length === 0) return null;
  return t.length > SITE_NAME_MAX_LEN ? t.slice(0, SITE_NAME_MAX_LEN) : t;
};

const serializeAppCustomization = (row: AppCustomization | null, banners: CustomLibraryBanner[]) => {
  const faviconUrl =
    row?.faviconRelPath != null && row.faviconRelPath.length > 0 ? faviconUrlFromRow(row.updatedAt) : null;
  const hasOverrides =
    Boolean((row?.siteName ?? "").trim()) ||
    Boolean((row?.faviconRelPath ?? "").trim()) ||
    banners.length > 0;

  return {
    siteName: resolveSiteName(row?.siteName),
    hasOverrides,
    faviconUrl,
    customLibraryBanners: banners.map((b) => ({
      id: b.id,
      url: `/api/files/branding/library-banner/${b.id}`,
    })),
  };
};

export const customizationQueryResolvers = (prisma: PrismaClient) => ({
  appCustomization: async () => {
    beLog("query_appCustomization");
    const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
    const banners = await prisma.customLibraryBanner.findMany({ orderBy: { id: "asc" } });
    return serializeAppCustomization(row, banners);
  },
});

export const customizationMutationResolvers = (prisma: PrismaClient) => ({
  updateAppCustomization: async (_: unknown, { siteName }: { siteName: string }, ctx: GqlContext) => {
    beLog("mutation_updateAppCustomization");
    requireGqlAdmin(ctx);
    const toStore = normalizeSiteNameForStorage(siteName);
    await prisma.appCustomization.upsert({
      where: { id: 1 },
      update: { siteName: toStore },
      create: { id: 1, siteName: toStore },
    });
    const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
    const banners = await prisma.customLibraryBanner.findMany({ orderBy: { id: "asc" } });
    return serializeAppCustomization(row, banners);
  },

  resetAppCustomization: async (_: unknown, __: unknown, ctx: GqlContext) => {
    beLog("mutation_resetAppCustomization");
    requireGqlAdmin(ctx);
    const banners = await prisma.customLibraryBanner.findMany();
    const appBefore = await prisma.appCustomization.findUnique({ where: { id: 1 } });
    await prisma.$transaction(async (tx) => {
      await tx.customLibraryBanner.deleteMany({});
      await tx.appCustomization.upsert({
        where: { id: 1 },
        update: { siteName: null, faviconRelPath: null },
        create: { id: 1 },
      });
    });
    for (const b of banners) unlinkUploadRelPath(b.relPath);
    unlinkUploadRelPath(appBefore?.faviconRelPath);
    const row = await prisma.appCustomization.findUnique({ where: { id: 1 } });
    const afterBanners = await prisma.customLibraryBanner.findMany({ orderBy: { id: "asc" } });
    return serializeAppCustomization(row, afterBanners);
  },
});
