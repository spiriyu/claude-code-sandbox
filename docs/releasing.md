# Releasing

## Release Flow Overview

```
npm run release
    └── scripts/release.js
            ├── Prompts: which target? (Docker / CLI / Both / Update versions)
            ├── Prompts: version bump? (patch / minor / major / custom) — skipped for "Update versions"
            ├── Bumps version in apps/docker/package.json and/or apps/cli/package.json
            ├── git commit + tag push
            ├── git tag docker-vX.Y.Z          →  triggers docker-publish.yml (version release)
            ├── git tag docker-vX.Y.Z-rebuildTS →  triggers docker-publish.yml (versions.json rebuild)
            └── git tag cli-vX.Y.Z             →  triggers cli-publish.yml

docker-publish.yml:
    ├── Generates build matrix (node × python combinations from versions.json)
    ├── Builds and pushes all Docker image variants to Docker Hub
    └── Creates GitHub Release "Docker vX.Y.Z"  ← skipped for rebuild tags

cli-publish.yml:
    ├── Runs lint + tests
    ├── Builds (tsup)
    ├── Publishes @claude-code-sandbox/cli to npm
    └── Creates GitHub Release "CLI vX.Y.Z"
```

## Tag Strategy

| Tag pattern                         | Triggers             | Publishes to | GitHub Release      |
| ----------------------------------- | -------------------- | ------------ | ------------------- |
| `docker-v1.2.0`                     | `docker-publish.yml` | Docker Hub   | Yes                 |
| `docker-v1.2.0-rebuild202603071430` | `docker-publish.yml` | Docker Hub   | No (already exists) |
| `cli-v1.2.0`                        | `cli-publish.yml`    | npmjs.com    | Yes                 |

## Running a Release

From the workspace root:

```bash
npm run release
```

The script will interactively ask which target:

1. **Docker only** — bump Docker version, push `docker-v*` tag
2. **CLI only** — bump CLI version, push `cli-v*` tag
3. **Both** — bump both, push both tags (Docker first)
4. **Update versions** — for when `libs/shared/src/versions.json` was updated (see below)

For options 1–3, the script also asks for a version bump type (patch / minor / major / custom) per app.

For "Both", the Docker tag is pushed first so its workflow starts first. Both workflows then run in parallel (Docker builds take 10–20 min; CLI publish takes ~2 min).

### Dry Run (no changes made)

```bash
npm run release:dry-run
```

Prints every action without modifying files or running git commands.

## Releasing After a versions.json Update

When you add or remove a Node/Python version from `libs/shared/src/versions.json`:

1. Edit the file and commit the change normally (just a regular `git commit`)
2. Run `npm run release` and choose **"Update versions (rebuild Docker + patch CLI)"**

What happens:

- **Docker**: no version bump — a dated rebuild tag (`docker-v1.0.0-rebuild202603071430`) is pushed. The workflow rebuilds all image combinations under the current Docker version. Alias tags (`latest`, `node22`, etc.) are overwritten to point to the new runtime versions. No new GitHub Release is created (one already exists for `1.0.0`).
- **CLI**: automatically gets a patch version bump (e.g. `0.1.0` → `0.1.1`) and is published to npm, because the shared lib it bundles now includes the updated `versions.json`.

The rebuild tag timestamp format is `YYYYMMDDHHmm`, allowing multiple rebuilds in the same day without collision.

## Versioning

Each app tracks its own version independently:

| App    | Version file               |
| ------ | -------------------------- |
| Docker | `apps/docker/package.json` |
| CLI    | `apps/cli/package.json`    |

When releasing "Both", the script offers to use the same version for both apps.

## Required Setup

### GitHub Actions

No setup needed for `GITHUB_TOKEN` — GitHub provides it automatically in every workflow run.

### Docker Hub secrets

Set in: GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret               | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `DOCKERHUB_USERNAME` | Your Docker Hub username (`spiriyu`)                                                       |
| `DOCKERHUB_TOKEN`    | Docker Hub → Account Settings → Personal access tokens → Generate new token (Read & Write) |

### npm secret

| Secret      | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| `NPM_TOKEN` | npmjs.com → avatar → Access Tokens → Generate New Token → **Automation** type |

### Local git setup

The release script uses `git push` — ensure your local git is authenticated with GitHub (SSH key or HTTPS credential).

## Verifying a Release

### Docker

```bash
# After docker-publish.yml completes (10–20 min):
docker pull spiriyu/claude-code-sandbox:latest
docker pull spiriyu/claude-code-sandbox:1.0.0
```

### CLI

```bash
# After cli-publish.yml completes (~2 min):
npm install -g @claude-code-sandbox/cli
claude-code-sandbox --version
```

## Version Naming Convention (Docker images)

Docker image tags follow this pattern:

```
<release-version>_node<node-alias>_python<python-alias>
```

The highest node + highest python combination also gets `latest` and the bare `<release-version>` tag.

Example for Docker release `1.0.0`:

```
latest
1.0.0
1.0.0_node22.18.0_python3.13
1.0.0_node22_python3.13
1.0.0_node22.18_python3.13
...
```

See [shared-lib.md](./shared-lib.md#tag-alias-rules) for the complete alias rules.
