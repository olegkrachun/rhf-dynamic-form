import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import {
  formatChannelOutputs,
  resolveReleaseChannel,
} from "./releaseChannel.ts";

const PACKAGE_NOT_FOUND = /\bE404\b/;

const packageJsonUrl = new URL("../package.json", import.meta.url);

const { name, version } = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as {
  name: string;
  version: string;
};

const readRegistryLatest = (packageName: string): string | null => {
  let stdout: string;

  try {
    stdout = execFileSync("npm", ["view", packageName, "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();

    if (PACKAGE_NOT_FOUND.test(stderr)) {
      return null;
    }

    throw new Error(
      `could not read the published version of ${packageName}; refusing to guess a dist-tag\n${stderr}`
    );
  }

  const latest = stdout.trim();

  if (latest === "") {
    throw new Error(
      `npm view ${packageName} version returned nothing; refusing to guess a dist-tag`
    );
  }

  return latest;
};

const registryLatest = readRegistryLatest(name);
const channel = resolveReleaseChannel(version, registryLatest);

process.stdout.write(
  `${name}@${version} is a ${channel.kind} release (registry latest: ${registryLatest ?? "unpublished"}) -> npm tag "${channel.npmTag}"\n`
);

const githubOutput = process.env.GITHUB_OUTPUT;

if (githubOutput) {
  appendFileSync(githubOutput, formatChannelOutputs(channel));
}
