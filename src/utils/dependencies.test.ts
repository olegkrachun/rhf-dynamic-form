import { describe, expect, it } from "vitest";
import type {
  FormElement,
  SelectFieldElement,
  TextFieldElement,
} from "../types";
import {
  buildDependencyMap,
  findFieldByName,
  getFieldDefault,
  getFieldTypeDefault,
} from "./dependencies";

describe("buildDependencyMap", () => {
  it("should return empty map when no fields have dependencies", () => {
    const elements: FormElement[] = [
      { type: "text", name: "firstName" },
      { type: "text", name: "lastName" },
    ];

    const result = buildDependencyMap(elements);

    expect(result).toEqual({});
  });

  it("should map parent to single dependent", () => {
    const elements: FormElement[] = [
      {
        type: "select",
        name: "country",
        options: [{ value: "us", label: "US" }],
      },
      {
        type: "select",
        name: "city",
        options: [{ value: "nyc", label: "NYC" }],
        dependsOn: "country",
      },
    ];

    const result = buildDependencyMap(elements);

    expect(result).toEqual({ country: ["city"] });
  });

  it("should map parent to multiple dependents", () => {
    const elements: FormElement[] = [
      {
        type: "select",
        name: "country",
        options: [{ value: "us", label: "US" }],
      },
      {
        type: "select",
        name: "state",
        options: [{ value: "ny", label: "NY" }],
        dependsOn: "country",
      },
      {
        type: "select",
        name: "city",
        options: [{ value: "nyc", label: "NYC" }],
        dependsOn: "country",
      },
    ];

    const result = buildDependencyMap(elements);

    expect(result).toEqual({ country: ["state", "city"] });
  });

  it("should handle chained dependencies", () => {
    const elements: FormElement[] = [
      {
        type: "select",
        name: "country",
        options: [{ value: "us", label: "US" }],
      },
      {
        type: "select",
        name: "state",
        options: [{ value: "ny", label: "NY" }],
        dependsOn: "country",
      },
      {
        type: "select",
        name: "city",
        options: [{ value: "nyc", label: "NYC" }],
        dependsOn: "state",
      },
    ];

    const result = buildDependencyMap(elements);

    expect(result).toEqual({
      country: ["state"],
      state: ["city"],
    });
  });

  it("should handle dependencies in containers", () => {
    const elements: FormElement[] = [
      { type: "text", name: "trigger" },
      {
        type: "container",
        columns: [
          {
            type: "column",
            width: "100%",
            elements: [
              {
                type: "text",
                name: "dependent",
                dependsOn: "trigger",
              },
            ],
          },
        ],
      },
    ];

    const result = buildDependencyMap(elements);

    expect(result).toEqual({ trigger: ["dependent"] });
  });
});

describe("findFieldByName", () => {
  it("should find field at top level", () => {
    const elements: FormElement[] = [
      { type: "text", name: "firstName" },
      { type: "email", name: "email" },
    ];

    const result = findFieldByName(elements, "email");

    expect(result?.type).toBe("email");
    expect(result?.name).toBe("email");
  });

  it("should find field in container", () => {
    const elements: FormElement[] = [
      {
        type: "container",
        columns: [
          {
            type: "column",
            width: "100%",
            elements: [{ type: "text", name: "nested" }],
          },
        ],
      },
    ];

    const result = findFieldByName(elements, "nested");

    expect(result?.name).toBe("nested");
  });

  it("should return undefined for non-existent field", () => {
    const elements: FormElement[] = [{ type: "text", name: "existing" }];

    const result = findFieldByName(elements, "nonexistent");

    expect(result).toBeUndefined();
  });
});

describe("getFieldTypeDefault", () => {
  it("should return false for boolean", () => {
    const boolField = { type: "boolean" as const, name: "test" };
    expect(getFieldTypeDefault(boolField)).toBe(false);
  });

  it("should return empty string for text fields", () => {
    const textField: TextFieldElement = { type: "text", name: "test" };
    expect(getFieldTypeDefault(textField)).toBe("");

    // These types all return empty string
    const emailField = { type: "email" as const, name: "test" };
    const phoneField = { type: "phone" as const, name: "test" };
    const dateField = { type: "date" as const, name: "test" };

    expect(getFieldTypeDefault(emailField)).toBe("");
    expect(getFieldTypeDefault(phoneField)).toBe("");
    expect(getFieldTypeDefault(dateField)).toBe("");
  });

  it("should return null for single select", () => {
    const field: SelectFieldElement = {
      type: "select",
      name: "test",
      options: [],
    };
    expect(getFieldTypeDefault(field)).toBe(null);
  });

  it("should return empty array for multi-select", () => {
    const field: SelectFieldElement = {
      type: "select",
      name: "test",
      options: [],
      multiple: true,
    };
    expect(getFieldTypeDefault(field)).toEqual([]);
  });

  it("should return empty array for array field", () => {
    const field = {
      type: "array" as const,
      name: "test",
      itemFields: [],
    };
    expect(getFieldTypeDefault(field)).toEqual([]);
  });
});

describe("getFieldDefault", () => {
  it("should return config defaultValue when specified", () => {
    const field: TextFieldElement = {
      type: "text",
      name: "test",
      defaultValue: "my default",
    };

    expect(getFieldDefault(field)).toBe("my default");
  });

  it("should return type default when no defaultValue", () => {
    const textField: TextFieldElement = {
      type: "text",
      name: "test",
    };

    expect(getFieldDefault(textField)).toBe("");
  });

  it("should prefer explicit defaultValue over type default", () => {
    const selectField: SelectFieldElement = {
      type: "select",
      name: "test",
      options: [{ value: "preset", label: "Preset" }],
      defaultValue: "preset",
    };

    expect(getFieldDefault(selectField)).toBe("preset");
  });
});
