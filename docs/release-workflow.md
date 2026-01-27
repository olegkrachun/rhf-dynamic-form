# NPM Package Release Automation with release-please

This guide sets up automated versioning, changelog generation, and npm publishing using `release-please` with GitHub Actions.

## Overview

**Workflow:**

1. You develop and push commits using [Conventional Commits](https://www.conventionalcommits.org/)
2. `release-please` automatically creates/updates a Release PR with changelog and version bump
3. When you're ready to release, merge the Release PR
4. GitHub Actions automatically publishes to npm and creates a GitHub Release

## Prerequisites

- GitHub repository with your npm package
- npm account with publish access
- Repository uses Conventional Commits (e.g., `feat:`, `fix:`, `chore:`)

## Setup Instructions

### Step 1: Create npm Access Token

1. Go to [npmjs.com](https://www.npmjs.com/) → Account Settings → Access Tokens
2. Generate a new **Automation** token (works with 2FA enabled)
3. Copy the token (you won't see it again)

### Step 2: Add Secrets to GitHub Repository

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add the following secret:
   - Name: `NPM_TOKEN`
   - Value: Your npm automation token from Step 1

### Step 3: Create GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main  # or master, depending on your default branch

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node

  publish:
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build (if applicable)
        run: npm run build --if-present

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Step 4: Create release-please Configuration (Optional but Recommended)

Create `release-please-config.json` in your repo root:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "packages": {
    ".": {
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true
    }
  }
}
```

Create `.release-please-manifest.json` in your repo root:

```json
{
  ".": "0.0.0"
}
```

> Replace `"0.0.0"` with your current package version from `package.json`

### Step 5: Ensure package.json is Properly Configured

Your `package.json` should have:

```json
{
  "name": "your-package-name",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "your-build-command",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/your-repo.git"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Using Conventional Commits

release-please determines version bumps from commit messages:

| Commit Type | Example | Version Bump |
|-------------|---------|--------------|
| `fix:` | `fix: resolve parsing error` | Patch (1.0.0 → 1.0.1) |
| `feat:` | `feat: add new parser option` | Minor (1.0.0 → 1.1.0) |
| `feat!:` or `BREAKING CHANGE:` | `feat!: change API signature` | Major (1.0.0 → 2.0.0) |
| `chore:`, `docs:`, `style:` | `chore: update deps` | No release (but included in changelog) |

### Commit Message Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples:**

```bash
# Patch release
git commit -m "fix: handle edge case in PDF parser"

# Minor release
git commit -m "feat: add support for encrypted PDFs"

# Major release (breaking change)
git commit -m "feat!: change parse() return type

BREAKING CHANGE: parse() now returns a Promise instead of sync result"
```

## Release Workflow

### Day-to-Day Development

1. Make changes and commit using conventional commits
2. Push to main branch
3. release-please automatically creates/updates a Release PR titled "chore(main): release X.Y.Z"

### When Ready to Release

1. Go to Pull Requests in your GitHub repo
2. Find the Release PR (labeled `autorelease: pending`)
3. Review the changelog and version bump
4. Merge the PR
5. GitHub Actions will automatically:
   - Create a GitHub Release with tag
   - Publish the new version to npm
   - Update CHANGELOG.md

### Manual Version Override

If you need to force a specific version, add this to your commit message:

```bash
git commit --allow-empty -m "chore: release 2.0.0" -m "Release-As: 2.0.0"
```

## Advanced Configuration

### For TypeScript Projects

Update the workflow to ensure types are built:

```yaml
- name: Build
  run: |
    npm run build
    npm run build:types  # if separate
```

### For Scoped Packages (@org/package)

Ensure `package.json` has:

```json
{
  "name": "@your-org/your-package",
  "publishConfig": {
    "access": "public"
  }
}
```

### For Monorepos

Create `release-please-config.json`:

```json
{
  "packages": {
    "packages/core": {
      "release-type": "node"
    },
    "packages/utils": {
      "release-type": "node"
    }
  }
}
```

### Running Tests Before Publish

Add a test job:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  release-please:
    needs: test  # Only run after tests pass
    # ... rest of config
```

## Troubleshooting

### Release PR Not Created

- Ensure commits follow Conventional Commits format
- Check that you have `fix:`, `feat:`, or other releasable commit types
- `chore:` commits alone won't trigger a release

### npm Publish Fails

- Verify `NPM_TOKEN` secret is set correctly
- Check token has publish permissions
- Ensure package name isn't taken on npm
- For scoped packages, ensure `publishConfig.access` is set

### Version Mismatch

If `.release-please-manifest.json` version doesn't match `package.json`:

1. Manually sync the versions
2. Commit and push
3. release-please will pick up from there

## File Checklist

After setup, your repo should have:

```
your-repo/
├── .github/
│   └── workflows/
│       └── release.yml
├── .release-please-manifest.json
├── release-please-config.json
├── CHANGELOG.md (created automatically on first release)
└── package.json
```

## Quick Reference Commands

```bash
# Feature (minor bump)
git commit -m "feat: add new feature"

# Bug fix (patch bump)
git commit -m "fix: resolve issue"

# Breaking change (major bump)
git commit -m "feat!: breaking change description"

# No release trigger (documentation, etc.)
git commit -m "docs: update README"

# Force specific version
git commit --allow-empty -m "chore: release 2.0.0" -m "Release-As: 2.0.0"
```
