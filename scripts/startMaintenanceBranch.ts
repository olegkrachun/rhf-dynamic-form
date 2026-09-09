import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const RELEASE_TAG = /^(?:.+-)?v(\d+)\.(\d+)\.(\d+)$/;

const INFRA_PATHS = [
  ".github",
  "release-please-config.json",
  "scripts/releaseChannel.ts",
  "scripts/emitReleaseChannel.ts",
] as const;

const USAGE = `usage: node scripts/startMaintenanceBranch.ts <release-tag>

  <release-tag>   an existing tag, e.g. rhf-dynamic-forms-v1.12.0

Creates the matching maintenance branch (1.12.x), grafts the current release
infrastructure onto it, pins release-please to patch-only bumps and commits.
Never pushes.

  MAINTENANCE_INFRA_REF   git ref to take release infrastructure from
                          (default: origin/main)
`;

const git = (...args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const gitSucceeds = (...args: string[]): boolean => {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const say = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const [tag] = process.argv.slice(2);

if (!tag) {
  process.stderr.write(USAGE);
  throw new Error("a release tag is required");
}

const parsed = RELEASE_TAG.exec(tag);

if (!parsed) {
  throw new Error(
    `"${tag}" does not end in a release version like v1.12.0, so no maintenance line can be derived from it`
  );
}

const [, major, minor, patch] = parsed;
const version = `${major}.${minor}.${patch}`;
const branch = `${major}.${minor}.x`;
const infraRef = process.env.MAINTENANCE_INFRA_REF ?? "origin/main";

if (git("status", "--porcelain", "--untracked-files=no") !== "") {
  throw new Error(
    "there are uncommitted changes to tracked files; commit or set them aside first"
  );
}

if (!gitSucceeds("rev-parse", "--verify", "--quiet", `refs/tags/${tag}`)) {
  throw new Error(`tag ${tag} does not exist locally; run git fetch --tags`);
}

if (gitSucceeds("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`)) {
  throw new Error(`branch ${branch} already exists`);
}

if (!gitSucceeds("rev-parse", "--verify", "--quiet", infraRef)) {
  throw new Error(`release infrastructure ref ${infraRef} does not exist`);
}

const infraPaths = INFRA_PATHS.filter((path) =>
  gitSucceeds("cat-file", "-e", `${infraRef}:${path}`)
);

if (infraPaths.length === 0) {
  throw new Error(`${infraRef} carries none of: ${INFRA_PATHS.join(", ")}`);
}

say(`Opening ${branch} from ${tag} (version ${version})`);

git("switch", "--create", branch, tag);
git("checkout", infraRef, "--", ...infraPaths);

writeFileSync(
  ".release-please-manifest.json",
  `${JSON.stringify({ ".": version }, null, 2)}\n`
);

const config = JSON.parse(
  readFileSync("release-please-config.json", "utf8")
) as {
  packages: Record<string, Record<string, unknown>>;
};

config.packages["."]["versioning-strategy"] = "always-bump-patch";

writeFileSync(
  "release-please-config.json",
  `${JSON.stringify(config, null, 2)}\n`
);

git("add", ".release-please-manifest.json", ...infraPaths);
git("commit", "--message", `chore: open the ${branch} maintenance line`);

say(`
Grafted from ${infraRef}: ${infraPaths.join(", ")}
Pinned release-please to always-bump-patch, manifest set to ${version}.

Nothing has been pushed. To ship a fix on this line:

  git cherry-pick <fix commit>     # or land it through a PR onto ${branch}
  git push -u origin ${branch}

release-please will then open a release PR proposing ${major}.${minor}.${Number(patch) + 1}.`);
