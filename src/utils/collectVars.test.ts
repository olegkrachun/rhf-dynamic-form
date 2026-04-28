import { describe, expect, it } from "vitest";
import { collectVars } from "./collectVars";

describe("Utils | collectVars", () => {
  it("returns an empty array for a rule with no var references", () => {
    // act
    const vars = collectVars({ "!": true });

    // assert
    expect(vars).toEqual([]);
  });

  it("collects a single var reference", () => {
    // act
    const vars = collectVars({ var: "a.b" });

    // assert
    expect(vars).toEqual(["a.b"]);
  });

  it("collects distinct vars from nested operators", () => {
    // act
    const vars = collectVars({
      "!": {
        and: [
          { var: "accident.inNy.yes.value" },
          { var: "accident.inNy.no.value" },
        ],
      },
    });

    // assert
    expect(vars).toEqual(["accident.inNy.yes.value", "accident.inNy.no.value"]);
  });

  it("deduplicates repeated var references", () => {
    // act
    const vars = collectVars({
      and: [{ var: "a" }, { var: "a" }, { var: "b" }],
    });

    // assert
    expect(vars).toEqual(["a", "b"]);
  });

  it("supports the [path, defaultValue] var form", () => {
    // act
    const vars = collectVars({
      "==": [{ var: ["a.b", null] }, { var: "c" }],
    });

    // assert
    expect(vars).toEqual(["a.b", "c"]);
  });

  it("walks deeply nested operators", () => {
    // act
    const vars = collectVars({
      if: [
        { ">": [{ var: "count" }, 0] },
        { var: "positiveLabel" },
        { var: "negativeLabel" },
      ],
    });

    // assert
    expect(vars.sort()).toEqual(["count", "negativeLabel", "positiveLabel"]);
  });

  it("ignores non-string var values gracefully", () => {
    // act
    const vars = collectVars({
      and: [{ var: 42 as unknown as string }, { var: "real.path" }],
    });

    // assert
    expect(vars).toEqual(["real.path"]);
  });

  it("walks sibling keys after collecting a var (does not stop at the first var)", () => {
    // act — `var` and `fallback` are siblings on the same node; the walker
    // must descend into `fallback` after recording `var: 'a'`
    const vars = collectVars({
      var: "a",
      fallback: { var: "b" },
    } as unknown as Parameters<typeof collectVars>[0]);

    // assert
    expect(vars.sort()).toEqual(["a", "b"]);
  });
});
