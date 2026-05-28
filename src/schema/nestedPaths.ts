import { ZodArray, ZodObject, type ZodTypeAny, z } from "zod";

const NUMERIC_PATH_SEGMENT_PATTERN = /^\d+$/;

const isNumericPathSegment = (segment: string | undefined): boolean =>
  segment !== undefined && NUMERIC_PATH_SEGMENT_PATTERN.test(segment);

const getObjectShape = (
  schema: ZodTypeAny | undefined
): Record<string, ZodTypeAny> => {
  if (schema instanceof ZodObject) {
    return { ...schema.shape };
  }

  return {};
};

type NestedStructureNode = Record<string, unknown> | unknown[];

const isNestedStructureNode = (value: unknown): value is NestedStructureNode =>
  value !== null && typeof value === "object";

const createContainerForNextSegment = (nextPart: string | undefined) =>
  isNumericPathSegment(nextPart) ? [] : {};

const ensureNestedStructureChild = (
  current: NestedStructureNode,
  part: string,
  nextPart: string | undefined
): NestedStructureNode => {
  const nextContainer = createContainerForNextSegment(nextPart);

  if (Array.isArray(current)) {
    const index = Number(part);
    if (!isNestedStructureNode(current[index])) {
      current[index] = nextContainer;
    }
    return current[index] as NestedStructureNode;
  }

  if (!isNestedStructureNode(current[part])) {
    current[part] = nextContainer;
  }
  return current[part] as NestedStructureNode;
};

const setNestedStructureLeaf = (
  current: NestedStructureNode,
  lastPart: string
): void => {
  if (Array.isArray(current)) {
    current[Number(lastPart)] = undefined;
    return;
  }

  current[lastPart] = undefined;
};

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
  const existingSchema = shape[first];

  // React Hook Form uses numeric dot segments for arrays, e.g.
  // "policies.0.policy_number". Treat the numeric segment as an array index
  // and build a homogeneous array item schema from the remaining path.
  if (isNumericPathSegment(rest[0])) {
    const itemPath = rest.slice(1).join(".");

    if (!itemPath) {
      shape[first] = z.array(schema);
      return;
    }

    const existingItemSchema =
      existingSchema instanceof ZodArray
        ? (existingSchema.element as ZodTypeAny)
        : undefined;
    const itemShape = getObjectShape(existingItemSchema);
    setNestedSchema(itemShape, itemPath, schema);
    shape[first] = z.array(z.looseObject(itemShape));
    return;
  }

  const remainingPath = rest.join(".");
  const innerShape = getObjectShape(existingSchema);
  setNestedSchema(innerShape, remainingPath, schema);
  shape[first] = z.looseObject(innerShape);
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

  if (isNumericPathSegment(rest[0])) {
    if (!(existingSchema instanceof ZodArray)) {
      return undefined;
    }

    if (rest.length === 1) {
      return existingSchema.element as ZodTypeAny;
    }

    const itemSchema = existingSchema.element as ZodTypeAny;
    if (!(itemSchema instanceof ZodObject)) {
      return undefined;
    }

    return getNestedSchema(itemSchema.shape, rest.slice(1).join("."));
  }

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
    let current: NestedStructureNode = result;

    for (let i = 0; i < parts.length - 1; i++) {
      current = ensureNestedStructureChild(current, parts[i], parts[i + 1]);
    }

    const lastPart = parts.at(-1);
    if (lastPart !== undefined) {
      setNestedStructureLeaf(current, lastPart);
    }
  }

  return result;
};
