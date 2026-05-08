import { graphqlSchemaTypesCore } from "./schemaTypesCore";
import { graphqlSchemaTypesReading } from "./schemaTypesReading";
import { graphqlSchemaTypesTts } from "./schemaTypesTts";
import { graphqlSchemaTypesInputs } from "./schemaTypesInputs";

export const graphqlSchemaTypes = `
  ${graphqlSchemaTypesCore}
  ${graphqlSchemaTypesReading}
  ${graphqlSchemaTypesTts}
  ${graphqlSchemaTypesInputs}
`;
