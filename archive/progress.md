# Project Progress

## Overview
Two repositories for running Claude Code in a Docker sandbox:
- **claude-code-sandbox-docker-hub** — Docker image published to Docker Hub
- **claude-code-sandbox-docker-cli** — npm CLI (`@claude-code-sandbox/cli`) for managing the sandbox

## Decisions Made
| # | Decision | Choice |
|---|----------|--------|
| 1 | Docker Hub image name | `<user>/claude-code-sandbox` |
| 2 | npm package name | `@claude-code-sandbox/cli` |
| 3 | Base image | Debian bookworm-slim |
| 4 | Auth model | Support both API key + OAuth token, CLI guides users |
| 5 | CLI features | start/stop/status, shell, auth guide, config management |
| 6 | Existing docker/ POC | Use as guidelines, optimize freely |
| 7 | CI/CD | Document steps only, no workflow files yet |

## Phase Status

| Phase | File | Status | Summary |
|-------|------|--------|---------|
| 1 | `plan/1_project_infrastructure.md` | **Done** | Repo structure, deps, tooling, all commands scaffolded, `npm run build` passes |
| 2 | `plan/2_dockerfile_debian.md` | **Done** | Dockerfile on debian:bookworm-slim, entrypoint.sh, profile.d, PUBLISHING.md |
| 3 | `plan/3_cli_scaffolding.md` | **Done** (merged into Phase 1) | Core libs, logger, config store, docker helpers — all complete |
| 4 | `plan/4_cli_container_lifecycle.md` | **Done** (merged into Phase 1) | start/stop/status/shell all complete |
| 5 | `plan/5_cli_auth_guide.md` | **Done** (merged into Phase 1) | Auth wizard + credential management complete |
| 6 | `plan/6_cli_config_command.md` | **Done** (merged into Phase 1) | Config get/set/list/reset complete |
| 7 | `plan/7_testing_polish.md` | **Done** | 39 unit tests passing, code fixes, build + lint clean |
| 8 | `plan/8_cicd_documentation.md` | **Done** (merged into Phase 2) | PUBLISHING.md in both repos covers manual + GH Actions |

## Phase 1 Deliverables
- `claude-code-sandbox-docker-hub/`: README, .dockerignore, CLAUDE.md
- `claude-code-sandbox-docker-cli/`: full TypeScript project, all 6 commands implemented, builds clean
- CLI binary: `claude-code-sandbox` with `start`, `stop`, `status`, `shell`, `auth`, `config`
- `npm run build` passes, `node dist/cli.mjs --help` works

## Phase 2 Deliverables
- `claude-code-sandbox-docker-hub/Dockerfile` — debian:bookworm-slim, nvm+Node 22, pyenv+Python 3.13, Claude Code
- `scripts/entrypoint.sh` — auth validation + signal-safe exec
- `scripts/profile.d/{nvm,pyenv}.sh` — clean /etc/profile.d/ approach
- `config/.claude.json` — minimal bootstrap, no personal data
- `PUBLISHING.md` — manual + GitHub Actions publishing steps (both repos)

## Phase 7 Deliverables
- 4 test files, 39 tests, all passing (`npm test`)
- `vitest.config.ts` with node environment
- Code fixes: removed unused imports, extracted `buildRunArgs`, exported `formatUptime`, `maskToken`, `validateToken`
- `npm run build` and `npm run lint` both clean

## Status: ALL PHASES COMPLETE
