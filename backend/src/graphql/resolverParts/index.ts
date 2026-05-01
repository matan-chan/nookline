import type { PrismaClient } from "@prisma/client";
import { beLog } from "../../utils/beLog";
import { voiceProfileMutationResolvers, voiceProfileQueryResolvers } from "./voiceProfile";
import { highlightMutationResolvers, highlightQueryResolvers } from "./highlight";
import { bookmarkMutationResolvers, bookmarkQueryResolvers } from "./bookmark";
import { userTtsMutationResolvers, userTtsQueryResolvers } from "./userTts";
import { Library, libraryMutationResolvers, libraryQueryResolvers } from "./library";
import { Series, seriesMutationResolvers, seriesQueryResolvers } from "./series";
import { Book, bookMutationResolvers, bookQueryResolvers } from "./book";
import { customizationMutationResolvers, customizationQueryResolvers } from "./customization";
import { coreQueryResolvers } from "./core";
import { prisma } from "./prisma";

export const buildResolvers = (db: PrismaClient) => {
  beLog("buildResolvers");
  return {
  Query: {
    ...coreQueryResolvers,
    ...customizationQueryResolvers(db),
    ...libraryQueryResolvers(db),
    ...seriesQueryResolvers(db),
    ...bookQueryResolvers(db),
    ...bookmarkQueryResolvers(db),
    ...highlightQueryResolvers(db),
    ...voiceProfileQueryResolvers(db),
    ...userTtsQueryResolvers(db),
  },
  Mutation: {
    ...customizationMutationResolvers(db),
    ...libraryMutationResolvers(db),
    ...seriesMutationResolvers(db),
    ...bookMutationResolvers(db),
    ...bookmarkMutationResolvers(db),
    ...highlightMutationResolvers(db),
    ...voiceProfileMutationResolvers(db),
    ...userTtsMutationResolvers(db),
  },
  Library: Library(db),
  Series: Series(db),
  Book: Book(db),
};
};

export const resolvers = buildResolvers(prisma);
