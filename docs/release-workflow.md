# Release workflow

`rhf-dynamic-forms` is versioned and published by [release-please](https://github.com/googleapis/release-please) from GitHub Actions. Nothing is published by hand.

There are two kinds of release. A **current** release comes off `main` and takes the `latest` dist-tag. A **backport** comes off a maintenance branch, targets a version below the published `latest`, and takes a `v<major>-lts` dist-tag instead.

## How a normal release happens

1. Land work on `main` with [Conventional Commits](https://www.conventionalcommits.org/).
2. `.github/workflows/release.yaml` runs on every push to `main`. It runs the full validation suite, then release-please.
3. release-please opens or updates a release PR titled `chore(main): release rhf-dynamic-forms X.Y.Z`.
4. Merge that PR when you want to ship. The same workflow then tags, creates the GitHub release, builds and publishes to npm.

| Commit type | Version bump |
| --- | --- |
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` or `BREAKING CHANGE:` | major |
| `docs:`, `chore:`, `refactor:`, `test:` | hidden from the changelog |

To force a version, add a `Release-As: 2.0.0` footer to a commit.

## Authentication

Publishing uses **npm trusted publishing over OIDC**. There is no npm token in the workflow. The trust relationship is configured on npmjs.com under Packages → rhf-dynamic-forms → Settings → Trusted publishing, and it is bound to three things.

- Organization or user: `olegkrachun`
- Repository: `rhf-dynamic-form`
- Workflow filename: `release.yaml`

Two consequences follow from that binding.

- The `publish` job needs `id-token: write`. Removing it breaks publishing.
- **Publishing from a different workflow file will not authenticate.** If you ever split the publish step into its own workflow, add a second trusted publisher on npmjs.com first. A package may have up to ten, and an existing connection cannot be edited, only deleted and recreated.

OIDC is also what produces the signed provenance statement attached to each published version.

## Dist-tags

`latest` always points at the newest version overall. Backports never move it.

```
$ npm view rhf-dynamic-forms dist-tags
{ latest: '2.0.1', 'v1-lts': '1.12.1' }
```

Consumers get the newest release with `npm install rhf-dynamic-forms` and pin to a maintained older line with `npm install rhf-dynamic-forms@v1-lts`.

The tag is not configured anywhere. `scripts/emitReleaseChannel.ts` reads the version being published and the registry's current `latest`, and `scripts/releaseChannel.ts` decides between them. A backport also gets `--latest=false` applied to its GitHub release, so the repository's releases page keeps advertising the newest version.

Note that npm rejects any dist-tag that parses as a semver range, so `1.x`, `v1` and `1.12.x` are all unusable as tag names. That is why the tag is `v1-lts`.

## Hotfixing a released version

Maintenance branches are named `<major>.<minor>.x` and are cut from the tag of the version being patched. One branch serves one minor line, so a fix can never reach a version nobody asked for. `release.yaml` triggers on branches matching `[0-9]+.[0-9]+.x`.

### 1. Open the line

```bash
git fetch --tags
node scripts/startMaintenanceBranch.ts rhf-dynamic-forms-v1.12.0
```

This creates `1.12.x` at that tag, copies the current `.github/`, `release-please-config.json` and the two release scripts onto it, pins release-please to `always-bump-patch`, sets the manifest, and commits. It does not push.

The graft is deliberate. An old tag carries the release workflow *as it was then*, which will not have the current publish logic. Everything else on the branch, including `package.json`, `biome.jsonc` and `tsconfig.json`, stays as it was at that version.

### 2. Check the branch is green before you rely on it

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test
```

Old code does not always satisfy today's linter. Verified on 2026-09-08, `rhf-dynamic-forms-v1.10.1` passes typecheck and all 321 of its tests, but fails `pnpm lint` on three pre-existing issues that predate the branch, a deprecated key in `biome.jsonc` and unsorted attributes in `sample/index.html`. Validation runs before release-please, so clean that up in a `chore:` commit first or the release will never start.

### 3. Land the fix

Cherry-pick it or open a PR against the maintenance branch. Use a `fix:` commit so release-please produces a release.

### 4. Merge the release PR

release-please opens `chore(1.12.x): release rhf-dynamic-forms 1.12.1`. **Check that its base branch is the maintenance branch, not `main`,** then merge.

### 5. Verify

```bash
npm view rhf-dynamic-forms dist-tags     # latest must be unchanged
npm view rhf-dynamic-forms@v1-lts version
```

The repository's releases page should still show the newest version as Latest.

## Troubleshooting

**`Cannot implicitly apply the "latest" tag because previously published version X is higher`**
The publish step lost its `--tag` argument, or `scripts/emitReleaseChannel.ts` failed to produce the `npm_tag` output. Check the `Resolve release channel` step's log; it prints the version, the registry latest and the tag it chose.

**The release PR targets `main` instead of the maintenance branch**
`target-branch: ${{ github.ref_name }}` is missing from the release-please step. The input is optional and silently falls back to the repository's default branch.

**A hotfix took the Latest badge on the releases page**
The `Keep the newest release marked latest on GitHub` step did not run. It is conditional on `mark_github_latest == 'false'` and needs `contents: write`. Correct it with `gh release edit <tag> --latest=false`.

**Publishing fails to authenticate**
Check that `id-token: write` is still in the workflow permissions and that the workflow filename still matches the trusted publisher registered on npmjs.com.

**A release PR never appears**
release-please only releases on changelog-worthy commits. `chore:` and `docs:` alone will not produce one.

## Files

| Path | Role |
| --- | --- |
| `.github/workflows/release.yaml` | Trigger, release-please, build, publish |
| `.github/workflows/validation.yaml` | Reusable typecheck, lint, test jobs |
| `.github/actions/setup-environment` | pnpm and Node 24 |
| `release-please-config.json` | Release type, changelog sections, versioning strategy |
| `.release-please-manifest.json` | Current version, per branch |
| `scripts/releaseChannel.ts` | Decides the dist-tag. Unit tested |
| `scripts/emitReleaseChannel.ts` | Reads the registry, writes the workflow outputs |
| `scripts/startMaintenanceBranch.ts` | Opens a maintenance line from a tag |
