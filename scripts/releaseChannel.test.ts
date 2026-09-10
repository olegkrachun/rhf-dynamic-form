import { describe, expect, it } from "vitest";
import { formatChannelOutputs, resolveReleaseChannel } from "./releaseChannel";

const PLAIN_RELEASE_VERSION_ERROR = /plain release version/;
const EMPTY_NPM_TAG = /npm_tag=\n/;

describe("resolveReleaseChannel", () => {
  it("treats a version above the registry latest as the current release", () => {
    expect(resolveReleaseChannel("2.1.0", "2.0.1")).toEqual({
      kind: "current",
      npmTag: "latest",
      markGithubLatest: true,
    });
  });

  it("treats a version below the registry latest as a backport", () => {
    expect(resolveReleaseChannel("1.12.1", "2.0.1")).toEqual({
      kind: "backport",
      npmTag: "v1-lts",
      markGithubLatest: false,
    });
  });

  it("derives the lts tag from the major being published, not from the latest", () => {
    expect(resolveReleaseChannel("2.0.3", "3.0.0").npmTag).toBe("v2-lts");
  });

  it("detects a backport that differs only by minor", () => {
    expect(resolveReleaseChannel("1.12.1", "1.13.0").kind).toBe("backport");
  });

  it("detects a backport that differs only by patch", () => {
    expect(resolveReleaseChannel("1.12.1", "1.12.2").kind).toBe("backport");
  });

  it("compares numerically rather than lexicographically", () => {
    expect(resolveReleaseChannel("1.9.0", "1.12.0").kind).toBe("backport");
    expect(resolveReleaseChannel("1.12.0", "1.9.0").kind).toBe("current");
  });

  it("publishes to latest when nothing has been published yet", () => {
    expect(resolveReleaseChannel("0.1.0", null)).toEqual({
      kind: "current",
      npmTag: "latest",
      markGithubLatest: true,
    });
  });

  it("publishes to latest when the version equals the registry latest so npm reports the conflict", () => {
    expect(resolveReleaseChannel("2.0.1", "2.0.1").npmTag).toBe("latest");
  });

  it("rejects a version release-please would never produce", () => {
    expect(() => resolveReleaseChannel("2.0.0-rc.1", "1.0.0")).toThrow(
      PLAIN_RELEASE_VERSION_ERROR
    );
    expect(() => resolveReleaseChannel("v2.0.0", "1.0.0")).toThrow(
      PLAIN_RELEASE_VERSION_ERROR
    );
  });

  it("rejects an unparseable registry response", () => {
    expect(() => resolveReleaseChannel("1.12.1", "not a version")).toThrow(
      PLAIN_RELEASE_VERSION_ERROR
    );
  });
});

describe("formatChannelOutputs", () => {
  it("leaves the tag argument empty for a current release so npm keeps its own guard", () => {
    expect(formatChannelOutputs(resolveReleaseChannel("2.1.0", "2.0.1"))).toBe(
      "kind=current\nnpm_tag=latest\nnpm_tag_arg=\nmark_github_latest=true\n"
    );
  });

  it("emits the backport form", () => {
    expect(formatChannelOutputs(resolveReleaseChannel("1.12.1", "2.0.1"))).toBe(
      "kind=backport\nnpm_tag=v1-lts\nnpm_tag_arg=--tag v1-lts\nmark_github_latest=false\n"
    );
  });

  it("never passes --tag latest explicitly, whatever the inputs", () => {
    for (const [version, latest] of [
      ["2.1.0", "2.0.1"],
      ["2.0.1", "2.0.1"],
      ["0.1.0", null],
      ["1.12.1", "2.0.1"],
    ] as const) {
      expect(
        formatChannelOutputs(resolveReleaseChannel(version, latest))
      ).not.toContain("--tag latest");
    }
  });

  it("never emits an empty npm tag", () => {
    for (const latest of ["2.0.1", "1.0.0", null]) {
      expect(
        formatChannelOutputs(resolveReleaseChannel("1.12.1", latest))
      ).not.toMatch(EMPTY_NPM_TAG);
    }
  });
});
