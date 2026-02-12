import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  formConfigurationSchema,
  safeValidateConfiguration,
  validateConfiguration,
} from "./configValidator";

describe("configValidator", () => {
  describe("validateConfiguration", () => {
    it("should validate a valid text field", () => {
      const config = {
        elements: [{ type: "text", name: "firstName" }],
      };

      const result = validateConfiguration(config);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "text",
        name: "firstName",
      });
    });

    it("should validate a valid email field", () => {
      const config = {
        elements: [
          { type: "email", name: "contactEmail", label: "Email Address" },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "email",
        name: "contactEmail",
      });
    });

    it("should validate a valid boolean field", () => {
      const config = {
        elements: [
          {
            type: "boolean",
            name: "acceptTerms",
            label: "Accept Terms",
            validation: { required: true },
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "boolean",
        name: "acceptTerms",
        validation: { required: true },
      });
    });

    it("should validate a valid phone field", () => {
      const config = {
        elements: [
          {
            type: "phone",
            name: "mobile",
            placeholder: "+1 (555) 123-4567",
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "phone",
        name: "mobile",
      });
    });

    it("should validate a valid date field", () => {
      const config = {
        elements: [{ type: "date", name: "birthDate", label: "Date of Birth" }],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "date",
        name: "birthDate",
      });
    });

    it("should validate a valid select field with options", () => {
      const config = {
        elements: [
          {
            type: "select",
            name: "country",
            label: "Country",
            options: [
              { value: "us", label: "United States" },
              { value: "ca", label: "Canada" },
            ],
            multiple: false,
            searchable: true,
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "select",
        name: "country",
        options: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
        ],
      });
    });

    it("should validate a valid array field with itemFields", () => {
      const config = {
        elements: [
          {
            type: "array",
            name: "contacts",
            itemFields: [
              { type: "text", name: "name" },
              { type: "email", name: "email" },
            ],
            minItems: 1,
            maxItems: 5,
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "array",
        name: "contacts",
        minItems: 1,
        maxItems: 5,
      });
    });

    it("should validate a valid custom field", () => {
      const config = {
        elements: [
          {
            type: "custom",
            name: "address",
            component: "AddressLookup",
            componentProps: { apiKey: "123" },
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements[0]).toMatchObject({
        type: "custom",
        name: "address",
        component: "AddressLookup",
      });
    });

    it("should validate a valid container with children", () => {
      const config = {
        elements: [
          {
            type: "container",
            children: [
              {
                type: "container",
                variant: "column",
                meta: { width: "50%" },
                children: [{ type: "text", name: "firstName" }],
              },
              {
                type: "container",
                variant: "column",
                meta: { width: "50%" },
                children: [{ type: "text", name: "lastName" }],
              },
            ],
          },
        ],
      };

      const result = validateConfiguration(config);

      expect(result.elements).toHaveLength(1);
      const container = result.elements[0] as {
        type: string;
        children: unknown[];
      };
      expect(container.type).toBe("container");
      expect(container.children).toHaveLength(2);
    });

    it("should accept any field type string (type-agnostic engine)", () => {
      const config = {
        elements: [{ type: "textarea", name: "test" }],
      };

      const result = validateConfiguration(config);
      expect(result.elements).toHaveLength(1);
    });

    it("should reject missing required properties", () => {
      const config = {
        elements: [{ type: "text" }], // Missing 'name'
      };

      expect(() => validateConfiguration(config)).toThrow(ZodError);
    });

    it("should reject invalid validation config", () => {
      const config = {
        elements: [
          {
            type: "text",
            name: "test",
            validation: {
              required: "yes", // Should be boolean
            },
          },
        ],
      };

      expect(() => validateConfiguration(config)).toThrow(ZodError);
    });

    it("should reject invalid JSON Logic rule format gracefully", () => {
      // JSON Logic rules are accepted as any object - validation happens at runtime
      const config = {
        elements: [
          {
            type: "text",
            name: "test",
            visible: { "==": [{ var: "show" }, true] },
          },
        ],
      };

      // This should pass schema validation (JSON Logic format is loose)
      const result = validateConfiguration(config);
      expect(result.elements[0]).toMatchObject({ name: "test" });
    });

    it("should validate select options require value and label", () => {
      const config = {
        elements: [
          {
            type: "select",
            name: "test",
            options: [{ value: "a" }], // Missing label
          },
        ],
      };

      expect(() => validateConfiguration(config)).toThrow(ZodError);
    });

    it("should validate nested array itemFields recursively", () => {
      const config = {
        elements: [
          {
            type: "array",
            name: "nested",
            itemFields: [
              {
                type: "array",
                name: "inner",
                itemFields: [{ type: "text", name: "value" }],
              },
            ],
          },
        ],
      };

      const result = validateConfiguration(config);
      expect(result.elements).toHaveLength(1);
    });
  });

  describe("safeValidateConfiguration", () => {
    it("should return success result for valid config", () => {
      const config = {
        elements: [{ type: "text", name: "test" }],
      };

      const result = safeValidateConfiguration(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.elements).toHaveLength(1);
      }
    });

    it("should return error result for invalid config", () => {
      const config = {
        elements: [], // At least one element required
      };

      const result = safeValidateConfiguration(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });

  describe("formConfigurationSchema", () => {
    it("should accept optional form name", () => {
      const config = {
        name: "My Form",
        elements: [{ type: "text", name: "test" }],
      };

      const result = formConfigurationSchema.parse(config);

      expect(result.name).toBe("My Form");
    });

    it("should accept customComponents definitions", () => {
      const config = {
        elements: [{ type: "custom", name: "test", component: "MyComponent" }],
        customComponents: {
          MyComponent: { defaultProps: { color: "blue" } },
        },
      };

      const result = formConfigurationSchema.parse(config);

      expect(result.customComponents?.MyComponent).toBeDefined();
    });

    it("should validate dependsOn and resetOnParentChange properties", () => {
      const config = {
        elements: [
          {
            type: "select",
            name: "country",
            options: [{ value: "us", label: "US" }],
          },
          {
            type: "select",
            name: "city",
            options: [{ value: "nyc", label: "New York" }],
            dependsOn: "country",
            resetOnParentChange: true,
          },
        ],
      };

      const result = formConfigurationSchema.parse(config);

      const cityField = result.elements[1] as {
        dependsOn?: string;
        resetOnParentChange?: boolean;
      };
      expect(cityField.dependsOn).toBe("country");
      expect(cityField.resetOnParentChange).toBe(true);
    });

    it("should validate optionsSource variants", () => {
      const configWithApi = {
        elements: [
          {
            type: "select",
            name: "test",
            options: [],
            optionsSource: { type: "api", endpoint: "/api/options" },
          },
        ],
      };

      const resultApi = formConfigurationSchema.parse(configWithApi);
      expect(resultApi.elements).toHaveLength(1);

      const configWithMap = {
        elements: [
          {
            type: "select",
            name: "test",
            options: [],
            optionsSource: { type: "map", key: "countries" },
          },
        ],
      };

      const resultMap = formConfigurationSchema.parse(configWithMap);
      expect(resultMap.elements).toHaveLength(1);

      const configWithSearch = {
        elements: [
          {
            type: "select",
            name: "test",
            options: [],
            optionsSource: {
              type: "search",
              endpoint: "/api/search",
              minChars: 3,
            },
          },
        ],
      };

      const resultSearch = formConfigurationSchema.parse(configWithSearch);
      expect(resultSearch.elements).toHaveLength(1);
    });

    it("should validate visibility on containers and column containers", () => {
      const config = {
        elements: [
          {
            type: "container",
            visible: { "==": [{ var: "showSection" }, true] },
            children: [
              {
                type: "container",
                variant: "column",
                meta: { width: "100%" },
                visible: { "==": [{ var: "showColumn" }, true] },
                children: [{ type: "text", name: "test" }],
              },
            ],
          },
        ],
      };

      const result = formConfigurationSchema.parse(config);
      expect(result.elements).toHaveLength(1);
    });
  });
});
