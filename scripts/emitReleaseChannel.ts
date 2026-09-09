import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import {
  formatChannelOutputs,
  resolveReleaseChannel,
} from "./releaseChannel.ts";

const packageJsonUrl = new URL("../package.json", import.meta.url);

const { name, version } = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as {
  name: string;
  version: string;
};

const readRegistryLatest = (packageName: string): string | null => {
  try {
    const stdout = execFileSync("npm", ["view", packageName, "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const latest = stdout.trim();
    return latest === "" ? null : latest;
  } catch {
    return null;
  }
};

const registryLatest = readRegistryLatest(name);
const channel = resolveReleaseChannel(version, registryLatest);

process.stdout.write(
  `${name}@${version} is a ${channel.kind} release (registry latest: ${registryLatest ?? "none"}) -> npm tag "${channel.npmTag}"\n`
);

const githubOutput = process.env.GITHUB_OUTPUT;

if (githubOutput) {
  appendFileSync(githubOutput, formatChannelOutputs(channel));
}
