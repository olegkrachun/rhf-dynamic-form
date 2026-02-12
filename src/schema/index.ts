export type { SchemaFactory, SchemaMap } from "./fieldSchemas";
export {
  buildFieldSchema,
  defaultSchemaMap,
  isFieldOptional,
  resetSchemaMap,
  setSchemaMap,
} from "./fieldSchemas";

export type {
  GeneratedSchema,
  InferSchemaType,
} from "./generateSchema";
export {
  generateZodSchema,
  getSchemaFieldPaths,
} from "./generateSchema";

export {
  createNestedStructure,
  getNestedSchema,
  setNestedSchema,
} from "./nestedPaths";
