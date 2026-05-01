import type { PrismaClient } from "@prisma/client";
import type { GqlContext } from "../gqlContext";
import { requireGqlUser } from "../gqlContext";
import { beLog, beLogErr } from "../../utils/beLog";
import { prismaSchemaMessage } from "../../utils/prismaSchemaMessage";
import { probeTtsSynthesis, resolveTtsTarget } from "../../services/ttsResolve";
import { buildTtsUserUpdatePayload, serializeTtsSettings } from "../resolverSerialize";
import { ERR_USER_NOT_FOUND } from "./errors";

const TTS_PROBE_FALLBACK = "TTS probe failed";

export const userTtsQueryResolvers = (prisma: PrismaClient) => ({
  ttsSettings: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_ttsSettings", { userId });
    const session = requireGqlUser(ctx);
    if (userId !== session.id) throw new Error("Forbidden");
    try {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (!u) throw new Error(ERR_USER_NOT_FOUND);
      return serializeTtsSettings(u);
    } catch (e) {
      beLogErr("query_ttsSettings", e, { userId });
      const hint = prismaSchemaMessage(e);
      if (hint) throw new Error(hint);
      throw e;
    }
  },

  ttsEngineProbe: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_ttsEngineProbe", { userId });
    const session = requireGqlUser(ctx);
    if (userId !== session.id) throw new Error("Forbidden");
    try {
      const target = await resolveTtsTarget(prisma, userId);
      return await probeTtsSynthesis(target);
    } catch (e) {
      beLogErr("query_ttsEngineProbe", e, { userId });
      const msg = e instanceof Error ? e.message : TTS_PROBE_FALLBACK;
      return { ok: false, error: msg };
    }
  },
});

export const userTtsMutationResolvers = (prisma: PrismaClient) => ({
  updateTtsSettings: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_updateTtsSettings", { userId: input?.userId });
    const session = requireGqlUser(ctx);
    if (input.userId !== session.id) throw new Error("Forbidden");
    try {
      const existing = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!existing) throw new Error(ERR_USER_NOT_FOUND);
      const data = buildTtsUserUpdatePayload(input, existing);
      await prisma.user.update({ where: { id: input.userId }, data });
      const u = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!u) throw new Error(ERR_USER_NOT_FOUND);
      return serializeTtsSettings(u);
    } catch (e) {
      beLogErr("mutation_updateTtsSettings", e, { userId: input?.userId });
      const hint = prismaSchemaMessage(e);
      if (hint) throw new Error(hint);
      throw e;
    }
  },
});
