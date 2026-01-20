import { describe, expect, it } from "vitest";
import type {
  ContainerElement,
  FieldElement,
  FormElement,
  TextFieldElement,
} from "../types";
import { flattenFields, getFieldNames } from "./flattenFields";

describe("flattenFields", () => {
  it("should return a single field unchanged", () => {
    const field: TextFieldElement = {
      type: "text",
      name: "firstName",
    };
    const elements: FormElement[] = [field];

    const result = flattenFields(elements);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(field);
  });

  it("should return multiple fields in order", () => {
    const elements: FormElement[] = [
      { type: "text", name: "firstName" },
      { type: "text", name: "lastName" },
      { type: "email", name: "email" },
    ];

    const result = flattenFields(elements);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("firstName");
    expect(result[1].name).toBe("lastName");
    expect(result[2].name).toBe("email");
  });

  it("should extract fields from container columns", () => {
    const container: ContainerElement = {
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
    };
    const elements: FormElement[] = [container];

    const result = flattenFields(elements);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("firstName");
    expect(result[1].name).toBe("lastName");
  });

  it("should extract fields from deeply nested containers", () => {
    const nestedContainer: ContainerElement = {
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
                  elements: [{ type: "text", name: "nested1" }],
                },
                {
                  type: "column",
                  width: "50%",
                  elements: [{ type: "text", name: "nested2" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const elements: FormElement[] = [nestedContainer];

    const result = flattenFields(elements);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("nested1");
    expect(result[1].name).toBe("nested2");
  });

  it("should extract fields from mixed elements (fields and containers)", () => {
    const elements: FormElement[] = [
      { type: "text", name: "topLevel" },
      {
        type: "container",
        columns: [
          {
            type: "column",
            width: "100%",
            elements: [
              { type: "email", name: "inContainer" },
              { type: "boolean", name: "inContainerToo" },
            ],
          },
        ],
      },
      { type: "phone", name: "anotherTopLevel" },
    ];

    const result = flattenFields(elements);

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("topLevel");
    expect(result[1].name).toBe("inContainer");
    expect(result[2].name).toBe("inContainerToo");
    expect(result[3].name).toBe("anotherTopLevel");
  });

  it("should return empty array when no elements provided", () => {
    const elements: FormElement[] = [];

    const result = flattenFields(elements);

    expect(result).toHaveLength(0);
  });

  it("should return empty array when containers have no fields", () => {
    const container: ContainerElement = {
      type: "container",
      columns: [
        {
          type: "column",
          width: "100%",
          elements: [],
        },
      ],
    };
    const elements: FormElement[] = [container];

    const result = flattenFields(elements);

    expect(result).toHaveLength(0);
  });

  it("should handle all field types", () => {
    const elements: FormElement[] = [
      { type: "text", name: "text" },
      { type: "email", name: "email" },
      { type: "boolean", name: "boolean" },
      { type: "phone", name: "phone" },
      { type: "date", name: "date" },
      {
        type: "select",
        name: "select",
        options: [{ value: "a", label: "A" }],
      },
      {
        type: "array",
        name: "array",
        itemFields: [{ type: "text", name: "item" }],
      },
      { type: "custom", name: "custom", component: "MyComponent" },
    ];

    const result = flattenFields(elements);

    expect(result).toHaveLength(8);
    expect(result.map((f: FieldElement) => f.type)).toEqual([
      "text",
      "email",
      "boolean",
      "phone",
      "date",
      "select",
      "array",
      "custom",
    ]);
  });
});

describe("getFieldNames", () => {
  it("should return field names for simple fields", () => {
    const elements: FormElement[] = [
      { type: "text", name: "firstName" },
      { type: "email", name: "email" },
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["firstName", "email"]);
  });

  it("should return field names from nested containers", () => {
    const elements: FormElement[] = [
      {
        type: "container",
        columns: [
          {
            type: "column",
            width: "50%",
            elements: [{ type: "text", name: "source.firstName" }],
          },
          {
            type: "column",
            width: "50%",
            elements: [{ type: "text", name: "source.lastName" }],
          },
        ],
      },
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["source.firstName", "source.lastName"]);
  });

  it("should preserve order of fields", () => {
    const elements: FormElement[] = [
      { type: "text", name: "z_field" },
      { type: "text", name: "a_field" },
      {
        type: "container",
        columns: [
          {
            type: "column",
            width: "100%",
            elements: [{ type: "text", name: "m_field" }],
          },
        ],
      },
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["z_field", "a_field", "m_field"]);
  });

  it("should return empty array for empty elements", () => {
    const result = getFieldNames([]);

    expect(result).toEqual([]);
  });
});
