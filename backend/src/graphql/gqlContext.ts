import type { User } from "@prisma/client";
import { GraphQLError } from "graphql";

export type GqlAuthUser = Pick<User, "id" | "username" | "isAdmin" | "avatarRelPath">;

export type GqlContext = { user: GqlAuthUser | null };

export const requireGqlUser = (ctx: GqlContext): GqlAuthUser => {
  if (ctx.user == null) {
    throw new GraphQLError("Unauthenticated", { extensions: { code: "UNAUTHENTICATED" } });
  }
  return ctx.user;
};

export const requireGqlAdmin = (ctx: GqlContext): GqlAuthUser => {
  const u = requireGqlUser(ctx);
  if (!u.isAdmin) {
    throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
  }
  return u;
};
