export type ReleaseKind = "current" | "backport";

export type ReleaseChannel = {
  kind: ReleaseKind;
  npmTag: string;
  markGithubLatest: boolean;
};

const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
};

const parseVersion = (version: string): ParsedVersion => {
  const match = RELEASE_VERSION.exec(version);

  if (!match) {
    throw new Error(
      `Expected a plain release version like "1.12.1", received "${version}"`
    );
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

const compareVersions = (left: ParsedVersion, right: ParsedVersion): number => {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
};

export const resolveReleaseChannel = (
  versionToPublish: string,
  registryLatest: string | null
): ReleaseChannel => {
  const candidate = parseVersion(versionToPublish);

  const isBackport =
    registryLatest !== null &&
    compareVersions(candidate, parseVersion(registryLatest)) < 0;

  if (isBackport) {
    return {
      kind: "backport",
      npmTag: `v${candidate.major}-lts`,
      markGithubLatest: false,
    };
  }

  return { kind: "current", npmTag: "latest", markGithubLatest: true };
};

export const formatChannelOutputs = (channel: ReleaseChannel): string =>
  [
    `kind=${channel.kind}`,
    `npm_tag=${channel.npmTag}`,
    `npm_tag_arg=${channel.kind === "backport" ? `--tag ${channel.npmTag}` : ""}`,
    `mark_github_latest=${channel.markGithubLatest}`,
    "",
  ].join("\n");
