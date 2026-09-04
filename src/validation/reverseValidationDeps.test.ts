import { describe, expect, it } from "vitest";
import type { FormElement } from "../types";
import {
  buildReverseValidationDeps,
  getValidationDependents,
} from "./reverseValidationDeps";

const conditionedField = (name: string, vars: string[]): FormElement =>
  ({
    type: "text",
    name,
    validation: {
      condition: { and: vars.map((path) => ({ var: path })) },
      message: "invalid",
    },
  }) as FormElement;

describe("reverse validation dependencies", () => {
  it("indexes top-level dependencies and ignores self references", () => {
    // arrange
    const dependencies = buildReverseValidationDeps([
      conditionedField("endDate", ["startDate", "endDate", "startDate"]),
    ]);

    // act
    const dependents = getValidationDependents(
      dependencies,
      "startDate",
      () => undefined
    );

    // assert
    expect(dependents).toEqual(["endDate"]);
    expect(
      getValidationDependents(dependencies, "endDate", () => undefined)
    ).toEqual([]);
  });

  it("resolves $item dependencies only within the changed array row", () => {
    // arrange
    const dependencies = buildReverseValidationDeps([
      {
        type: "array",
        name: "claims",
        itemFields: [conditionedField("endDate", ["$item.startDate"])],
      } as FormElement,
    ]);

    // act
    const dependents = getValidationDependents(
      dependencies,
      "claims.3.startDate",
      () => undefined
    );

    // assert
    expect(dependents).toEqual(["claims.3.endDate"]);
  });

  it("expands root dependencies for every current array row", () => {
    // arrange
    const dependencies = buildReverseValidationDeps([
      {
        type: "array",
        name: "claims",
        itemFields: [conditionedField("status", ["matterType"])],
      } as FormElement,
    ]);

    // act
    const dependents = getValidationDependents(
      dependencies,
      "matterType",
      (name) => (name === "claims" ? [{}, {}, {}] : undefined)
    );

    // assert
    expect(dependents).toEqual([
      "claims.0.status",
      "claims.1.status",
      "claims.2.status",
    ]);
  });

  it("deduplicates a dependent reached through repeated condition vars", () => {
    // arrange
    const dependencies = buildReverseValidationDeps([
      conditionedField("summary", ["driver", "driver"]),
    ]);

    // act
    const dependents = getValidationDependents(
      dependencies,
      "driver",
      () => undefined
    );

    // assert
    expect(dependents).toEqual(["summary"]);
  });
});
