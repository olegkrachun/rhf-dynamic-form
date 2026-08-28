import { describe, expect, it } from "vitest";
import { formValuesEqual } from "./formValuesEqual";

describe("formValuesEqual", () => {
  it("treats missing and explicitly undefined nested fields as equal", () => {
    // arrange
    const baseline = { rows: [{ claimed: {} }] };
    const current = { rows: [{ claimed: { value: undefined } }] };

    // act
    const equal = formValuesEqual(current, baseline);

    // assert
    expect(equal).toBe(true);
  });

  it("still detects meaningful nested value changes", () => {
    // arrange
    const baseline = { rows: [{ claimed: {} }] };
    const current = { rows: [{ claimed: { value: "100" } }] };

    // act
    const equal = formValuesEqual(current, baseline);

    // assert
    expect(equal).toBe(false);
  });

  it("preserves array row count semantics", () => {
    // arrange
    const baseline = { rows: [{}] };
    const current = { rows: [{}, undefined] };

    // act
    const equal = formValuesEqual(current, baseline);

    // assert
    expect(equal).toBe(false);
  });
});
