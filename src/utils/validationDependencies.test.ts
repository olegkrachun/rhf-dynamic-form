import { describe, expect, it } from "vitest";
import type { FormConfiguration } from "../types";
import { getValidationDependents } from "./validationDependencies";

describe("validationDependencies", () => {
  it("indexes fields to revalidate by the changed source field", () => {
    // arrange
    const config: FormConfiguration = {
      elements: [
        { type: "boolean", name: "enabled" },
        {
          type: "text",
          name: "detail",
          validation: {
            condition: {
              if: [{ var: "enabled" }, { "!!": { var: "detail" } }, true],
            },
          },
        },
      ],
    };

    // act
    const enabledDependents = getValidationDependents(config, "enabled");
    const detailDependents = getValidationDependents(config, "detail");

    // assert
    expect(enabledDependents).toEqual(["detail"]);
    expect(detailDependents).toBeUndefined();
  });

  it("deduplicates dependencies and excludes self references", () => {
    // arrange
    const config: FormConfiguration = {
      elements: [
        {
          type: "text",
          name: "total",
          validation: {
            condition: {
              and: [
                { var: "subtotal" },
                { var: "subtotal" },
                { var: "total" },
              ],
            },
          },
        },
      ],
    };

    // act
    const dependents = getValidationDependents(config, "subtotal");

    // assert
    expect(dependents).toEqual(["total"]);
  });
});
