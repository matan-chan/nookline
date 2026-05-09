import type { PrismaClient } from "@prisma/client";
import { customizationMutationResolvers, customizationQueryResolvers } from "./customization/customization";
import { coreQueryResolvers } from "./core";
import { bookmarkMutationResolvers, bookmarkQueryResolvers } from "./book/social/bookmark";
import { bookMutationResolvers } from "./book/mutations/bookMutationResolvers";
import { bookQueryResolvers } from "./book/queries/bookQueryResolvers";
import { highlightMutationResolvers, highlightQueryResolvers } from "./book/social/highlight";
import { Library, libraryMutationResolvers, libraryQueryResolvers } from "./library/library";
import { prisma } from "./prisma";
import { Series, seriesMutationResolvers, seriesQueryResolvers } from "./series/series";
import { userTtsMutationResolvers, userTtsQueryResolvers } from "./tts/userTts";
import { voiceProfileMutationResolvers, voiceProfileQueryResolvers } from "./tts/voiceProfile";
import { Book } from "./book/fields/bookFieldResolvers";

export * from "./errors";
export * from "./prisma";

export const buildResolvers = (db: PrismaClient) => ({
  Query: {
    ...coreQueryResolvers,
    ...libraryQueryResolvers(db),
    ...seriesQueryResolvers(db),
    ...bookQueryResolvers(db),
    ...bookmarkQueryResolvers(db),
    ...highlightQueryResolvers(db),
    ...voiceProfileQueryResolvers(db),
    ...userTtsQueryResolvers(db),
    ...customizationQueryResolvers(db),
  },
  Mutation: {
    ...libraryMutationResolvers(db),
    ...seriesMutationResolvers(db),
    ...bookMutationResolvers(db),
    ...bookmarkMutationResolvers(db),
    ...highlightMutationResolvers(db),
    ...voiceProfileMutationResolvers(db),
    ...userTtsMutationResolvers(db),
    ...customizationMutationResolvers(db),
  },
  Book: Book(db),
  Library: Library(db),
  Series: Series(db),
});

export const resolvers = buildResolvers(prisma);

