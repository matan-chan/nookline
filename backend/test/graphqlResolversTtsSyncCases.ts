import { assignGlobalFetch } from "./assignGlobalFetch";
import { runGql } from "./graphqlRunGql";
import type { GqlContext } from "../src/graphql/gqlContext";
import type { ApolloServer } from "@apollo/server";
import type { PrismaClient } from "@prisma/client";
import { expect } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

type Ctx = { server: ApolloServer; prisma: PrismaClient; testDir: string; origFetch: typeof globalThis.fetch };

const queryAndUpdateTtsSettings = async ({ server }: Ctx, gqlCtx: GqlContext, uid: number) => {
  const tts0 = await runGql<{ ttsSettings: { mode: string; voice: string; model: string; readerShowPage: boolean } }>(
    server,
    `query($u: Int!) { ttsSettings(userId: $u) { mode voice model readerShowPage } }`,
    { u: uid },
    gqlCtx,
  );
  expect(tts0.ttsSettings.mode).toBe("kokoro");

  const tts1 = await runGql<{ updateTtsSettings: { mode: string; readerShowPage: boolean; readerDarkDocument: boolean; voice: string } }>(
    server,
    `mutation($in: UpdateTtsSettingsInput!) { updateTtsSettings(input: $in) { mode readerShowPage readerDarkDocument voice } }`,
    { in: { userId: uid, mode: "kokoro", readerShowPage: false, readerDarkDocument: true, voice: "af_bella" } },
    gqlCtx,
  );
  expect(tts1.updateTtsSettings.readerShowPage).toBe(false);
  expect(tts1.updateTtsSettings.readerDarkDocument).toBe(true);
  expect(tts1.updateTtsSettings.voice).toBe("af_bella");

  const probe = await runGql<{ ttsEngineProbe: { ok: boolean; error?: string | null } }>(
    server,
    `query($u: Int!) { ttsEngineProbe(userId: $u) { ok error } }`,
    { u: uid },
    gqlCtx,
  );
  expect(typeof probe.ttsEngineProbe.ok).toBe("boolean");
};

const exerciseSyncLibraryFromDisk = async ({ server, prisma, testDir }: Ctx, gqlCtx: GqlContext, uid: number) => {
  const booksRoot = join(testDir, "books-vol");
  const shelf = join(booksRoot, "shelf-a");
  mkdirSync(shelf, { recursive: true });
  writeFileSync(join(shelf, "synced.pdf"), "%PDF-1.4\n%\n");
  const prevUpload = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = booksRoot;

  const libRow = await prisma.library.create({ data: { userId: uid, name: "DiskLib", path: "shelf-a", type: "NOVEL" } });
  const syncData = await runGql<{ syncLibraryFromDisk: { id: number; title: string; filePath: string }[] }>(
    server,
    `mutation($lid: Int!) { syncLibraryFromDisk(libraryId: $lid) { id title filePath } }`,
    { lid: libRow.id },
    gqlCtx,
  );
  expect(syncData.syncLibraryFromDisk.length).toBe(1);
  expect(String(syncData.syncLibraryFromDisk[0].filePath)).toContain("synced.pdf");

  if (prevUpload === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = prevUpload;

  return libRow.id;
};

const exerciseEnrichMutations = async ({ server, prisma, testDir, origFetch }: Ctx, gqlCtx: GqlContext, uid: number) => {
  const lib = await prisma.library.create({ data: { userId: uid, name: "ELib", path: ".", type: "NOVEL" } });
  const book = await prisma.book.create({ data: { libraryId: lib.id, title: "SearchTitle", filePath: join(testDir, "e.pdf") } });
  const series = await prisma.series.create({ data: { libraryId: lib.id, title: "SearchSeries", status: "ONGOING" } });

  assignGlobalFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ docs: [] }) } as Response));
  await runGql(server, `mutation($id: Int!) { enrichBookFromOpenLibrary(id: $id) { id } }`, { id: book.id }, gqlCtx);
  await runGql(server, `mutation($id: Int!) { enrichSeriesFromOpenLibrary(id: $id) { id } }`, { id: series.id }, gqlCtx);
  globalThis.fetch = origFetch;

  const bookMeta = JSON.parse((await prisma.book.findUnique({ where: { id: book.id } }))!.metadata!);
  expect(bookMeta.openLibrary.fetchFailed).toBe(true);
  const seriesMeta = JSON.parse((await prisma.series.findUnique({ where: { id: series.id } }))!.metadata!);
  expect(seriesMeta.openLibrary.fetchFailed).toBe(true);

  return lib.id;
};

const cleanupTtsSync = async ({ prisma }: Ctx, uid: number, libIds: number[]) => {
  await prisma.book.deleteMany({ where: { libraryId: { in: libIds } } });
  await prisma.series.deleteMany({ where: { libraryId: { in: libIds } } });
  await prisma.library.deleteMany({ where: { id: { in: libIds } } });
  await prisma.user.deleteMany({ where: { id: uid } });
};

export const runTtsSyncTest = async (ctx: Ctx) => {
  const user = await ctx.prisma.user.create({ data: { email: "tts@test", username: "ttsuser", password: "-" } });
  const gqlCtx: GqlContext = {
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin, avatarRelPath: user.avatarRelPath },
  };
  await queryAndUpdateTtsSettings(ctx, gqlCtx, user.id);
  const diskLibId = await exerciseSyncLibraryFromDisk(ctx, gqlCtx, user.id);
  const enrichLibId = await exerciseEnrichMutations(ctx, gqlCtx, user.id);
  await cleanupTtsSync(ctx, user.id, [enrichLibId, diskLibId]);
};
