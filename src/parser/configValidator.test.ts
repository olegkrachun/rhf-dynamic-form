import { describe, expect, it } from "vitest";
import {
  type ParsedFormConfiguration,
  safeValidateConfiguration,
  validateConfiguration,
} from "./configValidator";

type FieldElement = ParsedFormConfiguration["elements"][number];
interface ValidationConfig {
  required?: boolean;
  type?: "number" | "email" | "date";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
  condition?: Record<string, unknown>;
}

describe("configValidator", () => {
  describe("validateConfiguration", () => {
    describe("valid configurations", () => {
      it("should validate simple text field configuration", () => {
        // Arrange
        const config = {
          elements: [{ type: "text", name: "name" }],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(result.elements).toHaveLength(1);
        expect(
          (result.elements[0] as FieldElement & { type: string }).type
        ).toBe("text");
      });

      it("should validate configuration with all field types", () => {
        // Arrange
        const config = {
          elements: [
            { type: "text", name: "text" },
            { type: "email", name: "email" },
            { type: "boolean", name: "boolean" },
            { type: "phone", name: "phone" },
            { type: "date", name: "date" },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(result.elements).toHaveLength(5);
      });

      it("should validate custom field with component", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "custom",
              name: "customField",
              component: "CustomComponent",
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (result.elements[0] as FieldElement & { type: string }).type
        ).toBe("custom");
      });

      it("should validate optional form name", () => {
        // Arrange
        const config = {
          name: "Test Form",
          elements: [{ type: "text", name: "name" }],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(result.name).toBe("Test Form");
      });

      it("should validate container with columns", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "container",
              columns: [
                {
                  type: "column",
                  width: "50%",
                  elements: [{ type: "text", name: "firstName" }],
                },
                {
                  type: "column",
                  width: "50%",
                  elements: [{ type: "text", name: "lastName" }],
                },
              ],
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (result.elements[0] as FieldElement & { type: string }).type
        ).toBe("container");
      });

      it("should validate nested containers", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "container",
              columns: [
                {
                  type: "column",
                  width: "100%",
                  elements: [
                    {
                      type: "container",
                      columns: [
                        {
                          type: "column",
                          width: "50%",
                          elements: [{ type: "text", name: "nested" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(result.elements).toHaveLength(1);
      });
    });

    describe("validation rules", () => {
      it("should validate field with validation config", () => {
        // Arrange
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

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (
            result.elements[0] as FieldElement & {
              validation?: ValidationConfig;
            }
          ).validation
        ).toBeDefined();
        expect(
          (
            result.elements[0] as FieldElement & {
              validation?: ValidationConfig;
            }
          ).validation?.required
        ).toBe(true);
      });

      it("should validate JSON Logic condition in validation", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "phone",
              validation: {
                condition: {
                  or: [
                    { "!": { var: "hasPhone" } },
                    { regex_match: ["^[0-9]{10}$", { var: "phone" }] },
                  ],
                },
              },
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (
            result.elements[0] as FieldElement & {
              validation?: ValidationConfig;
            }
          ).validation?.condition
        ).toBeDefined();
      });

      it("should validate visible property with JSON Logic", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "conditionalField",
              visible: {
                "==": [{ var: "showField" }, true],
              },
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (
            result.elements[0] as FieldElement & {
              visible?: Record<string, unknown>;
            }
          ).visible
        ).toBeDefined();
      });
    });

    describe("optional fields", () => {
      it("should validate field with optional label", () => {
        // Arrange
        const config = {
          elements: [{ type: "text", name: "name", label: "Full Name" }],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (result.elements[0] as FieldElement & { label?: string }).label
        ).toBe("Full Name");
      });

      it("should validate field with optional placeholder", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "name",
              placeholder: "Enter your name",
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (result.elements[0] as FieldElement & { placeholder?: string })
            .placeholder
        ).toBe("Enter your name");
      });

      it("should validate field with defaultValue", () => {
        // Arrange
        const config = {
          elements: [
            { type: "text", name: "name", defaultValue: "Default Name" },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (result.elements[0] as FieldElement & { defaultValue?: string })
            .defaultValue
        ).toBe("Default Name");
      });

      it("should validate custom field with componentProps", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "custom",
              name: "custom",
              component: "CustomComponent",
              componentProps: { foo: "bar", count: 42 },
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert
        expect(
          (
            result.elements[0] as FieldElement & {
              componentProps?: Record<string, unknown>;
            }
          ).componentProps
        ).toEqual({
          foo: "bar",
          count: 42,
        });
      });
    });

    describe("invalid configurations", () => {
      it("should throw for missing elements array", () => {
        // Arrange
        const config = {};

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for empty elements array", () => {
        // Arrange
        const config = {
          elements: [],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for invalid field type", () => {
        // Arrange
        const config = {
          elements: [{ type: "invalid", name: "field" }],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for missing field name", () => {
        // Arrange
        const config = {
          elements: [{ type: "text" }],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for empty field name", () => {
        // Arrange
        const config = {
          elements: [{ type: "text", name: "" }],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for custom field without component", () => {
        // Arrange
        const config = {
          elements: [{ type: "custom", name: "custom" }],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for custom field with empty component name", () => {
        // Arrange
        const config = {
          elements: [{ type: "custom", name: "custom", component: "" }],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should allow container with empty columns array", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "container",
              columns: [],
            },
          ],
        };

        // Act
        const result = validateConfiguration(config);

        // Assert - schema allows empty columns array
        expect(
          (result.elements[0] as FieldElement & { type: string }).type
        ).toBe("container");
      });

      it("should throw for column with empty width", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "container",
              columns: [
                {
                  type: "column",
                  width: "",
                  elements: [{ type: "text", name: "field" }],
                },
              ],
            },
          ],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for invalid validation config", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "name",
              validation: {
                minLength: -1, // Invalid: negative
              },
            },
          ],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });

      it("should throw for validation with extra unknown properties", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "name",
              validation: {
                required: true,
                unknownProp: "value", // Invalid: unknown property
              },
            },
          ],
        };

        // Act & Assert
        expect(() => validateConfiguration(config)).toThrow();
      });
    });
  });

  describe("safeValidateConfiguration", () => {
    describe("valid configurations", () => {
      it("should return success for valid configuration", () => {
        // Arrange
        const config = {
          elements: [{ type: "text", name: "name" }],
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.elements).toHaveLength(1);
        }
      });

      it("should return typed data when successful", () => {
        // Arrange
        const config = {
          name: "Test Form",
          elements: [
            { type: "text", name: "firstName" },
            { type: "email", name: "email" },
          ],
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Test Form");
          expect(result.data.elements).toHaveLength(2);
        }
      });
    });

    describe("invalid configurations", () => {
      it("should return failure for empty elements array", () => {
        // Arrange
        const config = {
          elements: [],
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should return error details for invalid configuration", () => {
        // Arrange
        const config = {
          elements: [{ type: "invalid", name: "field" }],
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      it("should not throw for invalid configuration", () => {
        // Arrange
        const config = {
          invalid: "data",
        };

        // Act & Assert
        expect(() => safeValidateConfiguration(config)).not.toThrow();
      });

      it("should return failure for missing required field properties", () => {
        // Arrange
        const config = {
          elements: [{ type: "text" }], // Missing name
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should return failure for invalid validation values", () => {
        // Arrange
        const config = {
          elements: [
            {
              type: "text",
              name: "name",
              validation: {
                minLength: -1,
              },
            },
          ],
        };

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle null input", () => {
        // Arrange
        const config: null = null;

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should handle undefined input", () => {
        // Arrange
        const config: undefined = undefined;

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should handle non-object input", () => {
        // Arrange
        const config: string = "not an object";

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should handle array input instead of object", () => {
        // Arrange
        const config: Array<{ type: string; name: string }> = [
          { type: "text", name: "name" },
        ];

        // Act
        const result = safeValidateConfiguration(config);

        // Assert
        expect(result.success).toBe(false);
      });
    });
  });
});
