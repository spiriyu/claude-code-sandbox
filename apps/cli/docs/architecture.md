# CLI Architecture

## Overview

`@claude-code-sandbox/cli` is a Node.js/TypeScript CLI that manages multiple Claude Code sandbox Docker
containers. Each container gets a UUID-based identity, stored in a local JSON config, allowing
users to have independent sandboxes per project.

---

## Key Design Decisions

### 1. Multi-Container Model

Each sandbox is identified by a UUID v4. The config maps UUIDs to `ContainerRecord` objects
(workspace, image, Docker name, cached status). Multiple containers can exist simultaneously for
different workspaces.

Max **one container per workspace** — attempting to `start` in a workspace that already has a
container resumes it rather than creating a duplicate.

### 2. Dockerode (not CLI passthrough)

All Docker interactions use the `dockerode` npm package (connects to Docker daemon socket
directly), replacing the previous `spawnSync('docker', ...)` approach.

Benefits:
- No dependency on the Docker CLI being in `$PATH`
- Richer programmatic API with proper error objects
- Native stream multiplexing for the `attach` command
- Cleaner testability (mock the Docker client, not shell commands)

### 3. Custom JSON Config Store

The `conf` library is replaced with a hand-rolled JSON file manager at
`~/.claude-code-sandbox/config.json` (path configurable via `CLAUDE_SANDBOX_CONFIG_DIR`).

Why custom:
- Full control over the multi-container schema
- Atomic writes (write temp → rename) to avoid corruption
- Built-in schema versioning for future migrations
- No opaque third-party serialization

### 4. Soft-Delete History

Removed containers are kept in config with `removedAt` set. `ls` filters them out; `history`
shows everything. This preserves audit trail without bloating Docker.

### 5. State Sync on Invocation

There is no background daemon. Instead, every command that needs container state calls
`syncContainerStates()` which queries Docker for all known container names and updates
`lastStatus` in the config. This keeps the cache fresh on each use.

### 6. All Config Has an Env Var Override

Every setting — image name, tag, workspace, config dir — can be overridden by an env var.
Precedence: `CLI flag > env var > config file setting > built-in default`.

### 7. Non-Windows Only

The CLI validates at startup that `process.platform !== 'win32'`. If running on Windows, it
exits immediately with a clear error message. This is enforced because:
- Dockerode connects via Unix socket (`/var/run/docker.sock`)
- File paths use POSIX conventions throughout

### 8. Per-Container `.claude` Directory

Each container mounts a host directory into `/root/.claude` inside the container:
- Host: `~/.claude-code-sandbox/containers/<short-id>/.claude`
- Container: `/home/dev/.claude`

This persists Claude Code's configuration, memory files, and session data across container
restarts. The directory is created automatically before the container starts.

### 9. Input Validation Everywhere

All user inputs (workspace paths, container IDs, image names, tags, auth tokens) are validated
before any Docker or file-system operation runs. Validation errors produce clear, actionable
messages.

---

## File Structure

```
apps/cli/src/
├── cli.ts                      # Entry point: global options + command registration
├── commands/
│   ├── start.ts               # Create or resume a container
│   ├── stop.ts                # Stop a running container
│   ├── start-all.ts           # Start all stopped containers
│   ├── stop-all.ts            # Stop all running containers
│   ├── remove.ts              # Remove container from Docker (soft-delete in config)
│   ├── attach.ts              # Attach terminal to container's main process
│   ├── ls.ts                  # List active containers
│   ├── history.ts             # List all containers including removed
│   ├── auth.ts                # Manage credentials (wizard + status)
│   └── config.ts              # Manage CLI settings
├── lib/
│   ├── constants.ts           # All constants, env var names, built-in defaults
│   ├── config-store.ts        # Low-level JSON config CRUD + atomic save + migration
│   ├── container-store.ts     # Container record CRUD (wraps config-store)
│   ├── docker.ts              # Dockerode client + all container operations
│   ├── workspace.ts           # Workspace resolution (flag → env → cwd) + validation
│   └── selection.ts           # Interactive container selection via inquirer
└── utils/
    ├── logger.ts              # Chalk-colored output + ora spinner factory
    └── validation.ts          # Reusable validation helpers (paths, image names, etc.)
```

---

## Request Flow

```
User runs: claude-code-sandbox <command> [flags]
          │
          ▼
  cli.ts — parse global options
  (--workspace, --id, --config-dir resolved with env var fallbacks)
          │
          ▼
  config-store.ts — load ~/.claude-code-sandbox/config.json
  (create file + directory if first run)
          │
          ▼
  docker.ts — syncContainerStates()
  (query Docker for all known containers, update lastStatus in config)
          │
          ▼
  command handler — validate inputs, execute operation
          │
          ▼
  config-store.ts — save updated config
```

---

## Container Identity & Naming

| Field         | Value                                            |
|---------------|--------------------------------------------------|
| `id`          | UUID v4, e.g. `a1b2c3d4-e5f6-7890-abcd-ef12...` |
| `name`        | `claude-code-sandbox-<first-8-chars-of-uuid>`         |
| Short ID      | First 8 chars of UUID (used in `--id`, `ls`)     |

The Docker container name is derived deterministically from the UUID, so it's stable across
restarts and visible in `docker ps` output.

---

## Dependencies

| Package              | Purpose                                      |
|----------------------|----------------------------------------------|
| `dockerode`          | Docker daemon API client                     |
| `@types/dockerode`   | TypeScript types for dockerode               |
| `commander`          | CLI argument parsing                         |
| `inquirer`           | Interactive selection prompts                |
| `chalk`              | Colored terminal output                      |
| `ora`                | Spinner for async operations                 |
| `uuid`               | UUID v4 generation (`crypto.randomUUID()`)   |

Removed:
- `conf` — replaced by custom JSON store

---

## Migration from v0 (single-container model)

The existing `~/.claude-code-sandbox/config.json` (conf library format) is a different schema and
path. On first run with the new CLI:

1. Check for old config at `~/.claude-code-sandbox/` — if found, display migration notice
2. Carry over `settings.defaultImage`, `settings.defaultTag`, `settings.authMethod`
3. Do NOT auto-migrate container state (old model had a single unnamed container)
4. Write new config to `~/.claude-code-sandbox/config.json`

Migration is one-way and non-destructive (old file is left in place).
