# Publishing to Docker Hub

## Overview

Releases are managed with [release-it](https://github.com/release-it/release-it) and built automatically by GitHub Actions. Each release builds **all combinations** of Node.js × Python versions defined in `versions.json`, pushing multiple alias tags per build.

## Prerequisites

1. Docker Hub repository: `spiriyu/claude-code-sandbox`
2. GitHub repository secrets:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not your password) |

3. Node.js installed locally (for release-it)
4. `npm install` run in the repo root

## Version Matrix

`versions.json` defines which runtime versions to build:

```json
{
  "node": ["22.18.0", "20.19.4"],
  "python": ["3.13", "3.12", "3.11"]
}
```

This produces **6 Docker builds** (2 node × 3 python). Each build receives multiple alias tags computed from the version numbers.

### Tag Examples (release `v1.0.0`)

For the build with Node 22.18.0 + Python 3.13 (the highest of each):

```
1.0.0_node22.18.0_python3.13
1.0.0_node22.18.0_python3
1.0.0_node22.18_python3.13
1.0.0_node22.18_python3
1.0.0_node22_python3.13
1.0.0_node22_python3
latest
1.0.0
```

For a build with Node 20.19.4 + Python 3.12:

```
1.0.0_node20.19.4_python3.12
1.0.0_node20.19_python3.12
1.0.0_node20_python3.12
```

The `latest` and bare version tags always point to the highest node + highest python combination.

### Alias Resolution Rules

- **Full version** — always an alias (e.g. `22.18.0`)
- **Major.Minor** — only the highest patch gets this alias (e.g. `22.18`)
- **Major** — only the highest minor.patch gets this alias (e.g. `22`)

## Release Flow

### 1. Create a release

```bash
npm run release
```

This runs release-it, which will:
- Bump the version in `package.json`
- Commit and tag as `v<version>`
- Push the commit and tag to GitHub
- Create a GitHub Release

For a dry run: `npm run release -- --dry-run`

### 2. Automated build (GitHub Actions)

When the `v*` tag is pushed:

1. **Prepare job** — runs `scripts/generate-matrix.js` to produce the build matrix
2. **Build jobs** — run in parallel (one per node×python combination):
   - Sets up QEMU + Docker Buildx
   - Logs in to Docker Hub
   - Builds with `--build-arg NODE_VERSION=<full> --build-arg PYTHON_VERSION=<full>`
   - Pushes all computed tags for that combination
   - Platforms: `linux/amd64`, `linux/arm64`

### 3. Verify

```bash
docker pull spiriyu/claude-code-sandbox:latest
docker pull spiriyu/claude-code-sandbox:1.0.0_node22_python3
```

## Manual Publish (escape hatch)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NODE_VERSION=22.18.0 \
  --build-arg PYTHON_VERSION=3.13 \
  -t spiriyu/claude-code-sandbox:latest \
  --push \
  .
```

## Updating the Version Matrix

1. Edit `versions.json` to add/remove/update versions
2. Verify locally: `RELEASE_VERSION=test node scripts/generate-matrix.js | jq .`
3. Commit, then create a new release with `npm run release`
