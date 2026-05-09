import { graphqlSchemaMutation } from "./schemaMutation";
import { graphqlSchemaQuery } from "./schemaQuery";
import { graphqlSchemaTypes } from "./schemaTypes";

export const typeDefs = `#graphql
${graphqlSchemaQuery}
${graphqlSchemaMutation}
${graphqlSchemaTypes}
`;
