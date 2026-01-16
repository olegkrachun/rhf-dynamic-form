import { describe, expect, it } from "vitest";
import type { FormConfiguration } from "../types";
import { flattenFields, getFieldNames } from "./flattenFields";

describe("flattenFields", () => {
  describe("with simple field elements", () => {
    it("should return array of field elements", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "firstName" },
        { type: "email", name: "email" },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("firstName");
      expect(result[1].name).toBe("email");
    });

    it("should handle single field element", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "name" },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("name");
    });

    it("should handle all field types", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "text" },
        { type: "email", name: "email" },
        { type: "boolean", name: "boolean" },
        { type: "phone", name: "phone" },
        { type: "date", name: "date" },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(5);
      expect(result.map((f) => f.type)).toEqual([
        "text",
        "email",
        "boolean",
        "phone",
        "date",
      ]);
    });
  });

  describe("with container elements", () => {
    it("should extract fields from single column container", () => {
      const elements: FormConfiguration["elements"] = [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "name" },
                { type: "email", name: "email" },
              ],
            },
          ],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("name");
      expect(result[1].name).toBe("email");
    });

    it("should extract fields from multi-column container", () => {
      const elements: FormConfiguration["elements"] = [
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
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("firstName");
      expect(result[1].name).toBe("lastName");
    });

    it("should handle container with multiple fields per column", () => {
      const elements: FormConfiguration["elements"] = [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "text", name: "field1" },
                { type: "text", name: "field2" },
              ],
            },
            {
              type: "column",
              width: "50%",
              elements: [
                { type: "email", name: "field3" },
                { type: "phone", name: "field4" },
              ],
            },
          ],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(4);
      expect(result.map((f) => f.name)).toEqual([
        "field1",
        "field2",
        "field3",
        "field4",
      ]);
    });
  });

  describe("with nested containers", () => {
    it("should extract fields from deeply nested containers", () => {
      const elements: FormConfiguration["elements"] = [
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
                      elements: [{ type: "text", name: "nested.field1" }],
                    },
                    {
                      type: "column",
                      width: "50%",
                      elements: [{ type: "text", name: "nested.field2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("nested.field1");
      expect(result[1].name).toBe("nested.field2");
    });

    it("should handle multiple levels of nesting", () => {
      const elements: FormConfiguration["elements"] = [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "top" },
                {
                  type: "container",
                  columns: [
                    {
                      type: "column",
                      width: "100%",
                      elements: [
                        { type: "text", name: "middle" },
                        {
                          type: "container",
                          columns: [
                            {
                              type: "column",
                              width: "100%",
                              elements: [{ type: "text", name: "bottom" }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(3);
      expect(result.map((f) => f.name)).toEqual(["top", "middle", "bottom"]);
    });
  });

  describe("with mixed elements", () => {
    it("should extract fields from both direct elements and containers", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "title" },
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
        { type: "boolean", name: "accept" },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(4);
      expect(result.map((f) => f.name)).toEqual([
        "title",
        "firstName",
        "lastName",
        "accept",
      ]);
    });

    it("should preserve field order across mixed elements", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "field1" },
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [
                { type: "text", name: "field2" },
                { type: "text", name: "field3" },
              ],
            },
          ],
        },
        { type: "text", name: "field4" },
      ];

      const result = flattenFields(elements);

      expect(result.map((f) => f.name)).toEqual([
        "field1",
        "field2",
        "field3",
        "field4",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty elements array", () => {
      const result = flattenFields([]);

      expect(result).toHaveLength(0);
    });

    it("should handle container with empty columns", () => {
      const elements: FormConfiguration["elements"] = [
        {
          type: "container",
          columns: [],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(0);
    });

    it("should handle column with empty elements", () => {
      const elements: FormConfiguration["elements"] = [
        {
          type: "container",
          columns: [
            {
              type: "column",
              width: "100%",
              elements: [],
            },
          ],
        },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(0);
    });

    it("should handle nested field paths", () => {
      const elements: FormConfiguration["elements"] = [
        { type: "text", name: "source.name" },
        { type: "email", name: "source.contact.email" },
      ];

      const result = flattenFields(elements);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("source.name");
      expect(result[1].name).toBe("source.contact.email");
    });
  });
});

describe("getFieldNames", () => {
  it("should return array of field names", () => {
    const elements: FormConfiguration["elements"] = [
      { type: "text", name: "firstName" },
      { type: "email", name: "email" },
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["firstName", "email"]);
  });

  it("should extract names from nested containers", () => {
    const elements: FormConfiguration["elements"] = [
      { type: "text", name: "title" },
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
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["title", "firstName", "lastName"]);
  });

  it("should return empty array for empty elements", () => {
    const result = getFieldNames([]);

    expect(result).toEqual([]);
  });

  it("should preserve nested field path notation", () => {
    const elements: FormConfiguration["elements"] = [
      { type: "text", name: "source.name" },
      { type: "email", name: "source.contact.email" },
    ];

    const result = getFieldNames(elements);

    expect(result).toEqual(["source.name", "source.contact.email"]);
  });
});
