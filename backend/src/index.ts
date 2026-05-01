import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { assertProductionSigningSecret } from "./auth/authToken";
import { PrismaClient } from "@prisma/client";
import express from "express";
import { hashPassword } from "./auth/authPassword";
import { getAuthUserForRequest } from "./auth/getAuthUserForRequest";
import { buildAuthRouter } from "./routes/authRoutes";
import { resolvers } from "./graphql/resolvers";
import { typeDefs } from "./graphql/schema";
import filesRouter from "./routes/files";
import ttsRouter from "./routes/tts";
import { writeSrvLog } from "./utils/accessLog";
import { beLog, beLogErr } from "./utils/beLog";

const PORT = process.env.PORT ?? 4000;

const prisma = new PrismaClient();

const ensureLegacyLibrariesAdmin = async () => {
  const userCount = await prisma.user.count();
  const libCount = await prisma.library.count();
  if (userCount > 0 || libCount === 0) return;
  const pw = process.env.LEGACY_ADMIN_PASSWORD?.trim() || "nookline";
  const email = "admin@nookline.app";
  const username = "admin";
  beLog("ensureLegacyLibrariesAdmin", { msg: "libraries without users; seeding admin for migration" });
  await prisma.user.create({
    data: {
      email,
      username,
      password: await hashPassword(pw),
      isAdmin: true,
    },
  });
  const u = await prisma.user.findFirst({ where: { username } });
  if (u)
    await prisma.library.updateMany({
      data: { userId: u.id },
      where: {},
    });
};

const ensureAppCustomization = async () => {
  beLog("ensureAppCustomization");
  await prisma.appCustomization.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
};

const startServer = async () => {
  assertProductionSigningSecret();
  beLog("startServer");
  await ensureLegacyLibrariesAdmin();
  await ensureAppCustomization();

  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const pathNoQuery = req.originalUrl.split("?")[0];
    if (pathNoQuery === "/api/health") return next();
    const started = Date.now();
    const body = req.body as { operationName?: string } | undefined;
    const operationName =
      req.method === "POST" && body && typeof body.operationName === "string" ? body.operationName : undefined;
    writeSrvLog({
      event: "http_request",
      phase: "recv",
      method: req.method,
      path: pathNoQuery,
      ...(operationName ? { operationName } : {}),
    });
    res.once("finish", () => {
      writeSrvLog({
        event: "http_request",
        phase: "done",
        method: req.method,
        path: pathNoQuery,
        statusCode: res.statusCode,
        ms: Date.now() - started,
        ...(operationName ? { operationName } : {}),
      });
    });
    next();
  });

  app.get("/api/health", (_req, res) => {
    beLog("http_health");
    res.status(200).type("text/plain").send("ok");
  });

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  const authRouter = buildAuthRouter(prisma);
  app.use("/api/auth", authRouter);

  const gqlMw = expressMiddleware(apollo, {
    context: async ({ req }) => {
      const user = await getAuthUserForRequest(prisma, req.headers.authorization);
      return { user };
    },
  });
  app.use("/api/graphql", gqlMw);
  app.use("/graphql", gqlMw);
  app.use("/api/files", filesRouter);
  app.use("/api/tts", ttsRouter);

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Backend listening on 0.0.0.0:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/api/graphql (alias /graphql)`);
    writeSrvLog({ event: "nookline_boot", msg: "access logs use stderr (http_request recv/done)", port: Number(PORT) });
  });
};

startServer().catch((err) => {
  beLogErr("startServer", err);
  console.error("Fatal startup error:", err);
  process.exit(1);
});
