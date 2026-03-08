# Claude Code Instructions — claude-code-sandbox monorepo

## Documentation

Detailed docs live in `docs/`. Read these before making non-trivial changes:

| File                                           | Covers                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | Monorepo structure, NX setup, package relationships, design decisions      |
| [`docs/cli.md`](docs/cli.md)                   | CLI commands, source layout, key modules, how to add a command             |
| [`docs/docker-image.md`](docs/docker-image.md) | Dockerfile layers, build args, entrypoint, shell profiles, key paths       |
| [`docs/shared-lib.md`](docs/shared-lib.md)     | versions.json format, exports, tag alias rules, how to add/remove versions |
| [`docs/auth.md`](docs/auth.md)                 | Auth methods, credential resolution order, security model                  |
| [`docs/cicd.md`](docs/cicd.md)                 | CI/CD pipeline, workflow jobs, required secrets, manual publish            |
| [`docs/releasing.md`](docs/releasing.md)       | Release flow, release-it config, npm publish, version naming               |

---

## Project Overview

NX monorepo (lightweight — orchestrator only, no plugins):

| Package                               | Path           | Purpose                                    |
| ------------------------------------- | -------------- | ------------------------------------------ |
| `@claude-code-sandbox/cli`            | `apps/cli/`    | npm CLI for managing the sandbox container |
| `@spiriyu/claude-code-sandbox-docker` | `apps/docker/` | Dockerfile + CI/CD for Docker Hub          |
| `@spiriyu/claude-code-sandbox-shared` | `libs/shared/` | Shared versions.json + helper exports      |

## Quick Commands

```bash
# From workspace root
npm run build        # Build all (nx run-many -t build)
npm run test         # Test all (nx run-many -t test)
npm run lint         # Lint all (nx run-many -t lint)
npm run release      # Cut a release (release-it)

# Per-project
nx run cli:build
nx run cli:test
nx run cli:lint
nx run docker:generate-matrix   # verify CI matrix output
nx run docker:build             # local Docker image build
```

## Updating Runtime Versions

`libs/shared/src/versions.json` is the single source of truth — both CLI defaults and the CI matrix derive from it.

```bash
# 1. Edit libs/shared/src/versions.json
# 2. Verify matrix
RELEASE_VERSION=test node apps/docker/scripts/generate-matrix.js | jq .
# 3. Commit and release
```

→ Full details: [`docs/shared-lib.md`](docs/shared-lib.md#how-to-update-versions)

## Never Do

- Never hardcode credentials in any committed file
- Never commit `.env` files
- Never store auth tokens in the `conf` config store — use env vars or `~/.claude-code-sandbox/.env`
