# CI/CD Pipeline

## Overview

Two automated pipelines publish to Docker Hub and npm respectively. Each is triggered by its own tag prefix.

```
docker-v1.0.0 tag push                      (version release)
    └── GitHub Actions: .github/workflows/docker-publish.yml
            ├── [prepare job] generate-matrix.js → JSON matrix
            ├── [build jobs × 6] docker buildx → spiriyu/claude-code-sandbox:<tags>
            └── [release job] Create GitHub Release "Docker v1.0.0"

docker-v1.0.0-rebuild202603071430 tag push  (versions.json rebuild — same version)
    └── GitHub Actions: .github/workflows/docker-publish.yml
            ├── [prepare job] strips -rebuild suffix → version stays 1.0.0
            ├── [build jobs × 6] docker buildx → same tags, new runtime versions
            └── [release job] SKIPPED (release already exists for v1.0.0)

cli-v1.0.0 tag push
    └── GitHub Actions: .github/workflows/cli-publish.yml
            ├── lint + test
            ├── tsup build
            ├── npm publish → @claude-code-sandbox/cli
            └── Create GitHub Release "CLI v1.0.0"
```

Tags are created by running `npm run release` at the workspace root (see [releasing.md](./releasing.md)).

## docker-publish.yml

### Trigger

```yaml
on:
    push:
        tags: ['docker-v*']
```

### Environment

```yaml
env:
    DOCKER_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/claude-code-sandbox
```

### Job: `prepare`

1. Checkout repository
2. Set up Node.js 22
3. Extract version from tag — strips `docker-v` prefix and any `-rebuild<timestamp>` suffix:
    - `docker-v1.0.0` → `1.0.0`, `is_rebuild=false`
    - `docker-v1.0.0-rebuild202603071430` → `1.0.0`, `is_rebuild=true`
4. Run `node apps/docker/scripts/generate-matrix.js` with `RELEASE_VERSION=1.0.0`
5. Output: `matrix` JSON + `version` + `is_rebuild` passed to downstream jobs

### Job: `build` (matrix)

Runs once per node×python combination (6 parallel jobs). Each job:

1. Checkout repository
2. Set up QEMU (cross-platform emulation)
3. Set up Docker Buildx
4. Log in to Docker Hub
5. Compute full image tag strings (`DOCKER_IMAGE:<alias>`)
6. `docker buildx build` with:
    - `context: apps/docker`
    - `file: apps/docker/image/Dockerfile`
    - `platforms: linux/amd64,linux/arm64`
    - `push: true`
    - `--build-arg NODE_VERSION` and `PYTHON_VERSION`
    - GitHub Actions cache (`type=gha`)

### Job: `release`

Runs after all `build` jobs complete. Creates a GitHub Release titled "Docker vX.Y.Z" using the built-in `GITHUB_TOKEN`. **Skipped for rebuild tags** (`is_rebuild=true`) — the GitHub Release was already created by the original version publish.

## cli-publish.yml

### Trigger

```yaml
on:
    push:
        tags: ['cli-v*']
```

### Steps

1. Checkout, set up Node.js 22 with npm registry
2. `npm ci` — install all workspace dependencies
3. `npm run cli:lint` — must pass
4. `npm run cli:test` — must pass
5. `npm run cli:build` — tsup build
6. Set version in `apps/cli/package.json` from tag
7. `npm publish --access public` using `NPM_TOKEN` secret
8. Create GitHub Release "CLI vX.Y.Z"

## Required GitHub Secrets

Set in: GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret               | Used by              | Value                                                                                      |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `DOCKERHUB_USERNAME` | `docker-publish.yml` | Your Docker Hub username (`spiriyu`)                                                       |
| `DOCKERHUB_TOKEN`    | `docker-publish.yml` | Docker Hub → Account Settings → Personal access tokens → Generate new token (Read & Write) |
| `NPM_TOKEN`          | `cli-publish.yml`    | npmjs.com → avatar → Access Tokens → Generate New Token → **Automation** type              |

`GITHUB_TOKEN` (used for GitHub Release creation) is provided automatically — no setup needed.

## Build Matrix (Docker)

The matrix is computed by `apps/docker/scripts/generate-matrix.js`, which reads `libs/shared/src/versions.json`.

For the current `versions.json`:

```json
{ "node": ["22.18.0", "20.19.4"], "python": ["3.13", "3.12", "3.11"] }
```

This produces **6 build jobs** (2 node × 3 python). See [shared-lib.md](./shared-lib.md#tag-alias-rules) for the full tag alias resolution rules.

## Verifying the Matrix Locally

```bash
RELEASE_VERSION=1.0.0 node apps/docker/scripts/generate-matrix.js | jq .
```

## Manual Docker Publish (Emergency Escape Hatch)

If the workflow fails and you need to push manually:

```bash
cd apps/docker

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg NODE_VERSION=22.18.0 \
  --build-arg PYTHON_VERSION=3.13 \
  -t spiriyu/claude-code-sandbox:latest \
  -t spiriyu/claude-code-sandbox:1.0.0 \
  --push \
  .
```

## Verifying a Published Image

```bash
docker pull spiriyu/claude-code-sandbox:latest
docker pull spiriyu/claude-code-sandbox:1.0.0_node22_python3.13

# Quick smoke test
docker run --rm \
  -e ANTHROPIC_API_KEY=test \
  spiriyu/claude-code-sandbox \
  bash -lc "claude --version && node --version && python --version"
```

## Adding or Removing Version Support

1. Edit `libs/shared/src/versions.json`
2. Verify: `RELEASE_VERSION=test node apps/docker/scripts/generate-matrix.js | jq '.include | length'`
3. Commit the change, then run `npm run release` and choose **"Update versions"**

The release script creates a dated rebuild tag (`docker-v<current>-rebuild<ts>`) that triggers the Docker workflow using the existing version, plus auto-patches and publishes the CLI. See [releasing.md](./releasing.md#releasing-after-a-versionsjson-update) for full details.
