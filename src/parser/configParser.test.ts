import { describe, expect, it } from "vitest";
import { parseConfiguration, safeParseConfiguration } from "./configParser";

describe("parseConfiguration", () => {
  it("should parse valid configuration", () => {
    const config = {
      elements: [{ type: "text", name: "name", label: "Name" }],
    };

    const result = parseConfiguration(config);

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].type).toBe("text");
  });

  it("should parse configuration with all field types", () => {
    const config = {
      name: "Test Form",
      elements: [
        { type: "text", name: "textField" },
        { type: "email", name: "emailField" },
        { type: "boolean", name: "boolField" },
        { type: "phone", name: "phoneField" },
        { type: "date", name: "dateField" },
      ],
    };

    const result = parseConfiguration(config);

    expect(result.name).toBe("Test Form");
    expect(result.elements).toHaveLength(5);
  });

  it("should parse custom field element", () => {
    const config = {
      elements: [
        {
          type: "custom",
          name: "customField",
          component: "MyCustomComponent",
          componentProps: { foo: "bar" },
        },
      ],
    };

    const result = parseConfiguration(config);

    expect(result.elements[0].type).toBe("custom");
  });

  it("should accept any field type string (type-agnostic engine)", () => {
    const config = {
      elements: [{ type: "rich-text", name: "field1" }],
    };

    const result = parseConfiguration(config);
    expect(result.elements).toHaveLength(1);
  });

  it("should throw for missing required field name", () => {
    const config = {
      elements: [{ type: "text" }],
    };

    expect(() => parseConfiguration(config)).toThrow();
  });

  it("should throw for empty elements array", () => {
    const config = {
      elements: [],
    };

    expect(() => parseConfiguration(config)).toThrow();
  });

  it("should parse validation configuration", () => {
    const config = {
      elements: [
        {
          type: "text",
          name: "name",
          validation: {
            required: true,
            minLength: 3,
            maxLength: 100,
            pattern: "^[A-Za-z]+$",
            message: "Only letters allowed",
          },
        },
      ],
    };

    const result = parseConfiguration(config);
    const element = result.elements[0] as {
      validation?: Record<string, unknown>;
    };

    expect(element.validation?.required).toBe(true);
    expect(element.validation?.minLength).toBe(3);
    expect(element.validation?.maxLength).toBe(100);
    expect(element.validation?.pattern).toBe("^[A-Za-z]+$");
  });
});

describe("safeParseConfiguration", () => {
  it("should return success for valid configuration", () => {
    const config = {
      elements: [{ type: "text", name: "name" }],
    };

    const result = safeParseConfiguration(config);

    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  it("should return errors for invalid configuration (missing name)", () => {
    const config = {
      elements: [{ type: "text" }],
    };

    const result = safeParseConfiguration(config);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("should not throw for invalid configuration", () => {
    const config = { invalid: "data" };

    expect(() => safeParseConfiguration(config)).not.toThrow();

    const result = safeParseConfiguration(config);
    expect(result.success).toBe(false);
  });
});
