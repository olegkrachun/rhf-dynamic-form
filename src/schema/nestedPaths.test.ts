import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createNestedStructure,
  getNestedSchema,
  setNestedSchema,
} from "./nestedPaths";

describe("setNestedSchema", () => {
  it("should set a simple (non-nested) path", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "name", z.string());

    expect(shape.name).toBeDefined();
    expect(shape.name instanceof z.ZodString).toBe(true);
  });

  it("should create nested structure for dot-notation path", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "source.name", z.string());

    expect(shape.source).toBeDefined();
    expect(shape.source instanceof z.ZodObject).toBe(true);

    const sourceShape = (shape.source as z.ZodObject<any>).shape;
    expect(sourceShape.name).toBeDefined();
    expect(sourceShape.name instanceof z.ZodString).toBe(true);
  });

  it("should handle deeply nested paths", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "a.b.c.d", z.number());

    const aShape = (shape.a as z.ZodObject<any>).shape;
    const bShape = (aShape.b as z.ZodObject<any>).shape;
    const cShape = (bShape.c as z.ZodObject<any>).shape;

    expect(cShape.d instanceof z.ZodNumber).toBe(true);
  });

  it("should merge multiple fields at same nesting level", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "source.name", z.string());
    setNestedSchema(shape, "source.email", z.string().email());

    const sourceShape = (shape.source as z.ZodObject<any>).shape;
    expect(sourceShape.name instanceof z.ZodString).toBe(true);
    expect(sourceShape.email).toBeDefined();
  });

  it("should treat numeric path segments as homogeneous arrays", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(
      shape,
      "extraction_result.policies.0.policy_number",
      z.string()
    );
    setNestedSchema(shape, "extraction_result.policies.0.carrier", z.string());

    const extractionShape = (shape.extraction_result as z.ZodObject<any>).shape;
    expect(extractionShape.policies instanceof z.ZodArray).toBe(true);

    const policyShape = (extractionShape.policies as z.ZodArray<any>).element
      .shape;
    expect(policyShape.policy_number instanceof z.ZodString).toBe(true);
    expect(policyShape.carrier instanceof z.ZodString).toBe(true);
  });

  it("should support nested arrays from repeated numeric path segments", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "matrix.0.cells.0.value", z.number());

    const matrixItemShape = (shape.matrix as z.ZodArray<any>).element.shape;
    expect(matrixItemShape.cells instanceof z.ZodArray).toBe(true);

    const cellShape = (matrixItemShape.cells as z.ZodArray<any>).element.shape;
    expect(cellShape.value instanceof z.ZodNumber).toBe(true);
  });

  it("should create nested objects with passthrough", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "source.name", z.string());

    const sourceSchema = shape.source as z.ZodObject<any>;
    // Verify passthrough by parsing with extra properties
    const result = sourceSchema.safeParse({ name: "John", extra: "kept" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John", extra: "kept" });
    }
  });
});

describe("getNestedSchema", () => {
  it("should get a simple path schema", () => {
    const shape: Record<string, z.ZodTypeAny> = {
      name: z.string(),
    };

    const result = getNestedSchema(shape, "name");
    expect(result instanceof z.ZodString).toBe(true);
  });

  it("should get a nested path schema", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "source.name", z.string());

    const result = getNestedSchema(shape, "source.name");
    expect(result instanceof z.ZodString).toBe(true);
  });

  it("should get a schema through a numeric array path segment", () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    setNestedSchema(shape, "policies.0.policy_number", z.string());

    const result = getNestedSchema(shape, "policies.0.policy_number");
    expect(result instanceof z.ZodString).toBe(true);
  });

  it("should return undefined for non-existent path", () => {
    const shape: Record<string, z.ZodTypeAny> = {
      name: z.string(),
    };

    const result = getNestedSchema(shape, "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("createNestedStructure", () => {
  it("should create structure from simple paths", () => {
    const structure = createNestedStructure(["name", "email"]);

    expect(structure).toHaveProperty("name");
    expect(structure).toHaveProperty("email");
  });

  it("should create nested structure from dot-notation paths", () => {
    const structure = createNestedStructure([
      "source.name",
      "source.email",
      "active",
    ]);

    expect(structure).toHaveProperty("source");
    expect((structure.source as Record<string, unknown>).name).toBeUndefined();
    expect((structure.source as Record<string, unknown>).email).toBeUndefined();
    expect(structure).toHaveProperty("active");
  });

  it("should create arrays for numeric path segments", () => {
    const structure = createNestedStructure([
      "extraction_result.policies.0.policy_number",
    ]);

    expect(structure).toEqual({
      extraction_result: {
        policies: [{ policy_number: undefined }],
      },
    });
  });
});
