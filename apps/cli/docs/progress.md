# Implementation Progress

## Status Key
- [x] Not started
- [~] In progress
- [x] Complete

---

## Phase 1 — Foundation

Infrastructure and core library modules. Everything else depends on these.

- [x] Add `dockerode` + `@types/dockerode` to `apps/cli/package.json`
- [x] Create `lib/constants.ts` — all env var names, built-in defaults, Docker config constants
- [x] Create `utils/validation.ts` — reusable validators (paths, image names, tags, auth tokens)
- [x] Create `lib/config-store.ts` — JSON load/save (atomic), schema v1 defaults, migrate()
- [x] Create `lib/container-store.ts` — container CRUD (getAll, findById, findByWorkspace, add, update, markRemoved, syncStatus)
- [x] Create `lib/workspace.ts` — workspace resolution (flag → env → cwd) + directory validation
- [x] Create `lib/docker.ts` — dockerode client factory + container operations (ping, pull, create, start, stop, remove, attach, listContainerStates)
- [x] Create `lib/selection.ts` — interactive container selection prompt (inquirer, Docker-verified list only)
- [x] Add OS guard in `cli.ts` — exit with error if `process.platform === 'win32'`

---

## Phase 2 — Core Commands

Single-container commands.

- [x] `commands/start.ts` — create or resume container; create + mount `~/.claude-code-sandbox/containers/<id>/.claude` → `/root/.claude` (refactored for multi-container model)
- [x] `commands/stop.ts` — stop running container (refactored)
- [x] `commands/remove.ts` — remove container + soft-delete in config (new)
- [x] `commands/attach.ts` — attach to container entrypoint process (new, uses dockerode streams)
- [x] `commands/ls.ts` — list active containers in table, mark `currentContainerId` with `*` (new, replaces status command)
- [x] `commands/history.ts` — list all containers including removed (new)
- [x] `commands/use.ts` — interactive container selection, persists `currentContainerId` (new)

---

## Phase 3 — Bulk Commands

- [x] `commands/start-all.ts` — start all stopped containers (new)
- [x] `commands/stop-all.ts` — stop all running containers (new)

---

## Phase 4 — Existing Commands Update

- [x] `commands/auth.ts` — update config path from `~/.claude-code-sandbox` to new config dir
- [x] `commands/config.ts` — update to use new `Settings` schema and config-store
- [x] `cli.ts` — register all new commands, add global options (--id, --workspace, --config-dir), wire container selection

---

## Phase 5 — Testing

- [x] Unit tests for `lib/config-store.ts` (load/save/migrate)
- [x] Unit tests for `lib/container-store.ts` (CRUD operations)
- [x] Unit tests for `lib/docker.ts` (dockerode mocked)
- [x] Unit tests for `lib/workspace.ts` (path resolution)
- [x] Unit tests for `utils/validation.ts` (all validators)
- [x] Unit tests for `commands/start.ts`
- [x] Unit tests for `commands/stop.ts`
- [x] Unit tests for `commands/remove.ts`
- [x] Unit tests for `commands/ls.ts`
- [x] Unit tests for `commands/history.ts`
- [x] Unit tests for `commands/start-all.ts`
- [x] Unit tests for `commands/stop-all.ts`
- [x] Update CLI smoke tests (`test/cli-smoke.test.ts`)
- [x] Update or replace `test/e2e.sh`

---

## Phase 6 — Docs Update

- [x] Update root `docs/cli.md` (commands, modules)
- [x] Update root `docs/architecture.md` (note dockerode, multi-container model)
- [x] Verify `docs/auth.md` still accurate (new config path)

---

## Decisions (Resolved)

1. **`shell` vs `attach`** — Keep both.
   - `attach` = connect to the container's main process (entrypoint / Claude Code runner)
   - `shell` = open a new ephemeral bash session (`docker exec`); exiting kills the bash process
     but NOT the container

2. **`start` default behavior** — Start in the background, print status. No auto-attach.
   User runs `attach` separately to connect to the Claude Code process.

3. **Multiple containers per workspace** — Allowed. Each `start` in the same workspace
   can create a new container. Users manage them by `--id` or interactive prompt.

4. **Config path migration** — Start fresh. Old `~/.claude-code-sandbox/` is ignored and left
   untouched. No migration logic needed.

5. **`status` command** — Remove it. `ls` replaces it.
