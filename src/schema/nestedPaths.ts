import { ZodObject, type ZodTypeAny, z } from "zod";

/**
 * Sets a nested schema value using dot notation path.
 * Builds nested z.object structures as needed.
 *
 * @param shape - The shape object to modify
 * @param path - Dot-notation path (e.g., 'source.name')
 * @param schema - Zod schema to set at the path
 *
 * @example
 * ```typescript
 * const shape = {};
 * setNestedSchema(shape, 'source.name', z.string());
 * // shape is now: { source: ZodObject({ name: ZodString }) }
 *
 * setNestedSchema(shape, 'source.email', z.string().email());
 * // shape is now: { source: ZodObject({ name: ZodString, email: ZodString }) }
 * ```
 */
export const setNestedSchema = (
  shape: Record<string, ZodTypeAny>,
  path: string,
  schema: ZodTypeAny
): void => {
  const parts = path.split(".");

  // Base case: single-level path (no nesting)
  if (parts.length === 1) {
    shape[path] = schema;
    return;
  }

  const [first, ...rest] = parts;
  const remainingPath = rest.join(".");

  // If this level doesn't exist, create an empty object schema
  if (!shape[first]) {
    shape[first] = z.object({});
  }

  // Get the current schema at this level
  const existingSchema = shape[first];

  // If it's an object schema, get its shape and recursively set
  if (existingSchema instanceof ZodObject) {
    const innerShape: Record<string, ZodTypeAny> = { ...existingSchema.shape };
    setNestedSchema(innerShape, remainingPath, schema);
    shape[first] = z.object(innerShape);
  } else {
    // If it's not an object (shouldn't happen in normal use), create new
    const innerShape: Record<string, ZodTypeAny> = {};
    setNestedSchema(innerShape, remainingPath, schema);
    shape[first] = z.object(innerShape);
  }
};

/**
 * Gets a schema from a nested shape using dot notation path.
 *
 * @param shape - The shape object to read from
 * @param path - Dot-notation path
 * @returns The schema at the path, or undefined if not found
 */
export const getNestedSchema = (
  shape: Record<string, ZodTypeAny>,
  path: string
): ZodTypeAny | undefined => {
  const parts = path.split(".");

  if (parts.length === 1) {
    return shape[path];
  }

  const [first, ...rest] = parts;
  const existingSchema = shape[first];

  if (!(existingSchema && existingSchema instanceof ZodObject)) {
    return undefined;
  }

  return getNestedSchema(existingSchema.shape, rest.join("."));
};

/**
 * Creates a nested object structure from an array of paths.
 * Useful for initializing default values structure.
 *
 * @param paths - Array of dot-notation paths
 * @returns Nested object structure with undefined values at leaf nodes
 *
 * @example
 * ```typescript
 * const structure = createNestedStructure(['source.name', 'source.email', 'active']);
 * // Returns: { source: { name: undefined, email: undefined }, active: undefined }
 * ```
 */
export const createNestedStructure = (
  paths: string[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const path of paths) {
    const parts = path.split(".");
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts.at(-1);
    if (lastPart !== undefined) {
      current[lastPart] = undefined;
    }
  }

  return result;
};
