import type { GqlContext } from "../gqlContext";
import { beLog } from "../../utils/beLog";

export const coreQueryResolvers = {
  health: () => {
    beLog("query_health");
    return "ok";
  },
  me: (_: unknown, __: unknown, ctx: GqlContext) => {
    if (ctx.user == null) return null;
    return {
      id: ctx.user.id,
      username: ctx.user.username,
      isAdmin: ctx.user.isAdmin,
      hasAvatar: Boolean(ctx.user.avatarRelPath),
    };
  },
};
