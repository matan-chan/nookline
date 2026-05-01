import { ApolloServer, type GraphQLResponse } from "@apollo/server";
import { expect } from "bun:test";

export const runGql = async <T extends Record<string, unknown> = Record<string, unknown>>(
  server: ApolloServer,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const res = (await server.executeOperation({ query, variables })) as GraphQLResponse;
  expect(res.body?.kind).toBe("single");
  if (res.body.kind !== "single") throw new Error("expected single result");
  const { errors, data } = res.body.singleResult;
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (data == null) throw new Error("missing data");
  return data as T;
};
