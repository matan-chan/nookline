import { buildResolvers } from "../src/graphql/resolverParts";
import { typeDefs } from "../src/graphql/schema";
import { assignGlobalFetch } from "./assignGlobalFetch";
import { runGql } from "./graphqlRunGql";
import { newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";
import type { GqlContext } from "../src/graphql/gqlContext";
import { ApolloServer } from "@apollo/server";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

describe("GraphQL resolvers (isolated SQLite + Apollo executeOperation)", () => {
  let prisma: PrismaClient;
  let testDir: string;
  let server: ApolloServer;
  const origFetch = globalThis.fetch;

  beforeAll(async () => {
    testDir = newTestWorkDir();
    const databaseUrl = sqliteUrlInDir(testDir);
    runDbPush(databaseUrl);
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    server = new ApolloServer({ typeDefs, resolvers: buildResolvers(prisma) });
  });

  afterAll(async () => {
    globalThis.fetch = origFetch;
    await server.stop();
    await prisma.$disconnect();
    rmSync(testDir, { recursive: true, force: true });
  });

  test("health, libraries, and ttsSettings error for missing user", async () => {
    const h = await runGql<{ health: string }>(server, `{ health }`);
    expect(h.health).toBe("ok");

    const libs = await runGql<{ libraries: { id: number; name: string }[] }>(server, `{ libraries { id name } }`, undefined, {
      user: null,
    });
    expect(libs.libraries).toEqual([]);

    const bad = await server.executeOperation({ query: `query($u: Int!) { ttsSettings(userId: $u) { mode } }`, variables: { u: 99999 } });
    expect(bad.body?.kind).toBe("single");
    if (bad.body.kind !== "single") throw new Error("expected single");
    expect(bad.body.singleResult.errors?.length).toBeGreaterThan(0);
  });

  test("libraries through voice: CRUD, nested types, progress, onDeck, user lists", async () => {
    const user = await prisma.user.create({
      data: { email: "r@test", username: "reader1", password: "-" },
    });
    const userId = user.id;
    const gqlCtx: GqlContext = {
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin, avatarRelPath: user.avatarRelPath },
    };

    const libData = await runGql<{ createLibrary: { id: number; name: string; path: string } }>(
      server,
      `mutation { createLibrary(input: { name: "Lib", path: "p1", type: "NOVEL" }) { id name path } }`,
      undefined,
      gqlCtx,
    );
    const libraryId = libData.createLibrary.id;

    await runGql(
      server,
      `mutation($id: Int!, $in: UpdateLibraryInput!) { updateLibrary(id: $id, input: $in) { name path type } }`,
      { id: libraryId, in: { name: " Lib2 ", path: " p2 ", type: " MANGA " } },
      gqlCtx,
    );
    const updated = await prisma.library.findUnique({ where: { id: libraryId } });
    expect(updated?.name).toBe("Lib2");
    expect(updated?.path).toBe("p2");
    expect(updated?.type).toBe("MANGA");

    const serData = await runGql<{ createSeries: { id: number; libraryId: number; title: string } }>(
      server,
      `mutation($lid: Int!) { createSeries(input: { libraryId: $lid, title: "Arc", status: "ONGOING" }) { id libraryId title } }`,
      { lid: libraryId },
      gqlCtx,
    );
    const seriesId = serData.createSeries.id;

    const pdfPath = join(testDir, "chapter.pdf");
    writeFileSync(pdfPath, "%PDF-1.4\n%\n");

    const bookData = await runGql<{ createBook: { id: number; title: string; libraryId: number; seriesId: number } }>(
      server,
      `mutation($lid: Int!, $sid: Int!, $fp: String!) {
        createBook(input: { libraryId: $lid, seriesId: $sid, title: "Ch1", filePath: $fp, metadata: "{\\"fileExt\\":\\"pdf\\"}" }) {
          id title libraryId seriesId
        }
      }`,
      { lid: libraryId, sid: seriesId, fp: pdfPath },
      gqlCtx,
    );
    const bookId = bookData.createBook.id;

    type NestedLib = {
      library: { id: number; previewBook: { title: string }; series: { id: number; title: string }[]; books: { id: number }[] };
      seriesList: { id: number; books: { id: number }[] }[];
      series: { id: number; books: { title: string }[] };
      book: { id: number; fileExt: string | null; readingProgressForUser: { percentage: number } | null };
      recentlyAdded: { id: number }[];
    };
    const nested = await runGql<NestedLib>(
      server,
      `query($lid: Int!, $sid: Int!, $bid: Int!, $uid: Int!) {
        library(id: $lid) {
          id
          previewBook { title }
          series { id title }
          books { id }
        }
        seriesList(libraryId: $lid) { id books { id } }
        series(id: $sid) { id books { title } }
        book(id: $bid) {
          id
          fileExt
          readingProgressForUser(userId: $uid) { percentage }
        }
        recentlyAdded(limit: 5) { id }
      }`,
      { lid: libraryId, sid: seriesId, bid: bookId, uid: userId },
      gqlCtx,
    );
    expect(nested.library.previewBook.title).toBe("Ch1");
    expect(nested.seriesList[0].books.length).toBe(1);
    expect(nested.book.fileExt).toBe("pdf");
    expect(nested.book.readingProgressForUser).toBeNull();

    const prog = await runGql<{ updateReadingProgress: { userId: number; bookId: number; percentage: number; position: string } }>(
      server,
      `mutation($in: UpdateReadingProgressInput!) { updateReadingProgress(input: $in) { userId bookId percentage position } }`,
      { in: { userId, bookId, position: "12", percentage: 42 } },
      gqlCtx,
    );
    expect(prog.updateReadingProgress.percentage).toBe(42);

    const deck = await runGql<{ onDeck: { book: { id: number }; progress: { percentage: number } }[] }>(
      server,
      `query($uid: Int!) { onDeck(userId: $uid) { book { id } progress { percentage } } }`,
      { uid: userId },
      gqlCtx,
    );
    expect(deck.onDeck.length).toBe(1);
    expect(deck.onDeck[0].progress.percentage).toBe(42);

    await runGql(
      server,
      `mutation($u: Int!, $b: Int!) { setBookFavorite(userId: $u, bookId: $b, liked: true) { id } }`,
      {
        u: userId,
        b: bookId,
      },
      gqlCtx,
    );
    const favList = await runGql<{ favoriteBooks: { id: number }[] }>(
      server,
      `query($u: Int!) { favoriteBooks(userId: $u, limit: 10) { id } }`,
      { u: userId },
      gqlCtx,
    );
    expect(favList.favoriteBooks.map((x) => x.id)).toEqual([bookId]);
    const favField = await runGql<{ book: { isFavoriteForUser: boolean } }>(
      server,
      `query($b: Int!, $u: Int!) { book(id: $b) { isFavoriteForUser(userId: $u) } }`,
      { b: bookId, u: userId },
      gqlCtx,
    );
    expect(favField.book.isFavoriteForUser).toBe(true);
    await runGql(
      server,
      `mutation($u: Int!, $b: Int!) { setBookFavorite(userId: $u, bookId: $b, liked: false) { id } }`,
      {
        u: userId,
        b: bookId,
      },
      gqlCtx,
    );
    const favEmpty = await runGql<{ favoriteBooks: { id: number }[] }>(
      server,
      `query($u: Int!) { favoriteBooks(userId: $u, limit: 10) { id } }`,
      { u: userId },
      gqlCtx,
    );
    expect(favEmpty.favoriteBooks.length).toBe(0);

    const bm = await runGql<{ addBookmark: { id: number; position: string } }>(
      server,
      `mutation($in: AddBookmarkInput!) { addBookmark(input: $in) { id position } }`,
      { in: { userId, bookId, position: "1", note: "n" } },
      gqlCtx,
    );
    const hl = await runGql<{ addHighlight: { id: number; text: string; color: string } }>(
      server,
      `mutation($in: AddHighlightInput!) { addHighlight(input: $in) { id text color } }`,
      { in: { userId, bookId, startPos: "0", endPos: "1", text: "hi" } },
      gqlCtx,
    );
    const vp = await runGql<{ saveVoiceProfile: { id: number; name: string; modelId: string; speed: number; pitch: number } }>(
      server,
      `mutation($in: SaveVoiceProfileInput!) { saveVoiceProfile(input: $in) { id name modelId speed pitch } }`,
      { in: { userId, name: "V1", modelId: "kokoro" } },
      gqlCtx,
    );

    const lists = await runGql<{
      bookmarks: { id: number }[];
      highlights: { id: number; text: string }[];
      userBookmarks: { bookTitle: string }[];
      userHighlights: { text: string }[];
      voiceProfiles: { name: string }[];
    }>(
      server,
      `query($bid: Int!, $uid: Int!) {
        bookmarks(bookId: $bid) { id }
        highlights(bookId: $bid) { id text }
        userBookmarks(userId: $uid) { bookTitle }
        userHighlights(userId: $uid) { text }
        voiceProfiles(userId: $uid) { name }
      }`,
      { bid: bookId, uid: userId },
      gqlCtx,
    );
    expect(lists.bookmarks.length).toBe(1);
    expect(lists.highlights[0].text).toBe("hi");
    expect(lists.userBookmarks[0].bookTitle).toBe("Ch1");
    expect(lists.userHighlights[0].text).toBe("hi");
    expect(lists.voiceProfiles[0].name).toBe("V1");

    await runGql(server, `mutation($id: Int!) { deleteBookmark(id: $id) }`, { id: bm.addBookmark.id }, gqlCtx);
    await runGql(server, `mutation($id: Int!) { deleteHighlight(id: $id) }`, { id: hl.addHighlight.id }, gqlCtx);
    await runGql(server, `mutation($id: Int!) { deleteVoiceProfile(id: $id) }`, { id: vp.saveVoiceProfile.id }, gqlCtx);

    await runGql(server, `mutation($id: Int!) { deleteBook(id: $id) }`, { id: bookId }, gqlCtx);
    await runGql(server, `mutation($id: Int!) { deleteSeries(id: $id) }`, { id: seriesId }, gqlCtx);
    await runGql(server, `mutation($id: Int!) { deleteLibrary(id: $id) }`, { id: libraryId }, gqlCtx);

    expect(await prisma.book.count()).toBe(0);
    expect(await prisma.library.count()).toBe(0);
  });

  test("TTS settings, probe, enrich mutations, and syncLibraryFromDisk", async () => {
    const user = await prisma.user.create({
      data: { email: "tts@test", username: "ttsuser", password: "-" },
    });
    const uid = user.id;
    const gqlCtx: GqlContext = {
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin, avatarRelPath: user.avatarRelPath },
    };

    const tts0 = await runGql<{ ttsSettings: { mode: string; voice: string; model: string; readerShowPage: boolean } }>(
      server,
      `query($u: Int!) { ttsSettings(userId: $u) { mode voice model readerShowPage } }`,
      { u: uid },
      gqlCtx,
    );
    expect(tts0.ttsSettings.mode).toBe("kokoro");

    const tts1 = await runGql<{ updateTtsSettings: { mode: string; readerShowPage: boolean; voice: string } }>(
      server,
      `mutation($in: UpdateTtsSettingsInput!) { updateTtsSettings(input: $in) { mode readerShowPage voice } }`,
      { in: { userId: uid, mode: "kokoro", readerShowPage: false, voice: "af_bella" } },
      gqlCtx,
    );
    expect(tts1.updateTtsSettings.readerShowPage).toBe(false);
    expect(tts1.updateTtsSettings.voice).toBe("af_bella");

    const probe = await runGql<{ ttsEngineProbe: { ok: boolean; error?: string | null } }>(
      server,
      `query($u: Int!) { ttsEngineProbe(userId: $u) { ok error } }`,
      { u: uid },
      gqlCtx,
    );
    expect(typeof probe.ttsEngineProbe.ok).toBe("boolean");

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

    const lib = await prisma.library.create({ data: { userId: uid, name: "ELib", path: ".", type: "NOVEL" } });
    const book = await prisma.book.create({
      data: { libraryId: lib.id, title: "SearchTitle", filePath: join(testDir, "e.pdf") },
    });
    const series = await prisma.series.create({
      data: { libraryId: lib.id, title: "SearchSeries", status: "ONGOING" },
    });

    assignGlobalFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ docs: [] }),
      } as Response),
    );
    await runGql(server, `mutation($id: Int!) { enrichBookFromOpenLibrary(id: $id) { id } }`, { id: book.id }, gqlCtx);
    await runGql(server, `mutation($id: Int!) { enrichSeriesFromOpenLibrary(id: $id) { id } }`, { id: series.id }, gqlCtx);
    globalThis.fetch = origFetch;

    const bookMeta = JSON.parse((await prisma.book.findUnique({ where: { id: book.id } }))!.metadata!);
    expect(bookMeta.openLibrary.fetchFailed).toBe(true);
    const seriesMeta = JSON.parse((await prisma.series.findUnique({ where: { id: series.id } }))!.metadata!);
    expect(seriesMeta.openLibrary.fetchFailed).toBe(true);

    await prisma.book.deleteMany({ where: { libraryId: lib.id } });
    await prisma.series.deleteMany({ where: { libraryId: lib.id } });
    await prisma.library.deleteMany({ where: { id: { in: [lib.id, libRow.id] } } });
    await prisma.user.deleteMany({ where: { id: uid } });
  });
});
