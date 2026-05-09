import type { PrismaClient } from "@prisma/client";
import type { GqlContext } from "../../gqlContext";
import { requireGqlUser } from "../../gqlContext";
import { beLog } from "../../../utils/beLog";
import { serializeVoiceProfile } from "../../resolverSerialize";

const DEFAULT_VOICE_PROFILE_SPEED = 1.0;
const DEFAULT_VOICE_PROFILE_PITCH = 1.0;

export const voiceProfileQueryResolvers = (prisma: PrismaClient) => ({
  voiceProfiles: async (_: unknown, { userId }: { userId: number }, ctx: GqlContext) => {
    beLog("query_voiceProfiles", { userId });
    const u = requireGqlUser(ctx);
    if (userId !== u.id) throw new Error("Forbidden");
    const profiles = await prisma.voiceProfile.findMany({ where: { userId: u.id } });
    return profiles.map(serializeVoiceProfile);
  },
});

export const voiceProfileMutationResolvers = (prisma: PrismaClient) => ({
  saveVoiceProfile: async (_: unknown, { input }: { input: any }, ctx: GqlContext) => {
    beLog("mutation_saveVoiceProfile", { userId: input?.userId });
    const u = requireGqlUser(ctx);
    if (input.userId !== u.id) throw new Error("Forbidden");
    const data = { speed: DEFAULT_VOICE_PROFILE_SPEED, pitch: DEFAULT_VOICE_PROFILE_PITCH, isDefault: false, ...input, userId: u.id };
    const profile = await prisma.voiceProfile.create({ data });
    return serializeVoiceProfile(profile);
  },

  deleteVoiceProfile: async (_: unknown, { id }: { id: number }, ctx: GqlContext) => {
    beLog("mutation_deleteVoiceProfile", { id });
    const u = requireGqlUser(ctx);
    const ex = await prisma.voiceProfile.findFirst({ where: { id, userId: u.id } });
    if (ex == null) return false;
    await prisma.voiceProfile.delete({ where: { id } });
    return true;
  },
});
