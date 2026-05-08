import { buildResolvers } from "../src/graphql/resolverParts";
import { typeDefs } from "../src/graphql/schema";
import { runGql } from "./graphqlRunGql";
import { newTestWorkDir, runDbPush, sqliteUrlInDir } from "./testDb";
import { runCrudTest } from "./graphqlResolversCrudCases";
import { runTtsSyncTest } from "./graphqlResolversTtsSyncCases";
import { ApolloServer } from "@apollo/server";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "fs";

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

    const libs = await runGql<{ libraries: { id: number; name: string }[] }>(server, `{ libraries { id name } }`, undefined, { user: null });
    expect(libs.libraries).toEqual([]);

    const bad = await server.executeOperation({ query: `query($u: Int!) { ttsSettings(userId: $u) { mode } }`, variables: { u: 99999 } });
    expect(bad.body?.kind).toBe("single");
    if (bad.body.kind !== "single") throw new Error("expected single");
    expect(bad.body.singleResult.errors?.length).toBeGreaterThan(0);
  });

  test("libraries through voice: CRUD, nested types, progress, onDeck, user lists", async () => {
    await runCrudTest({ server, prisma, testDir });
  });

  test("TTS settings, probe, enrich mutations, and syncLibraryFromDisk", async () => {
    await runTtsSyncTest({ server, prisma, testDir, origFetch });
  });
});
