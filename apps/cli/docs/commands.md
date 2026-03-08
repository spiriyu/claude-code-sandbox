# CLI Command Specifications

## Global Options

Accepted before any subcommand. All have env var fallbacks.

| Flag                     | Env Var                     | Default                  | Description                          |
| ------------------------ | --------------------------- | ------------------------ | ------------------------------------ |
| `-w, --workspace <path>` | `CLAUDE_SANDBOX_WORKSPACE`  | `process.cwd()`          | Workspace directory to mount         |
| `--id <id>`              | —                           | —                        | Target container by UUID or short ID |
| `--config-dir <path>`    | `CLAUDE_SANDBOX_CONFIG_DIR` | `~/.claude-code-sandbox` | Config directory                     |
| `-h, --help`             | —                           | —                        | Show help                            |
| `-V, --version`          | —                           | —                        | Show version                         |

---

## Container Selection Logic

Commands that operate on a single container resolve the target in this order:

1. `--id <id>` provided → validate format (non-empty string) → verify container exists in Docker
   AND in our config → if invalid for any reason, print red warning and **continue with no
   container selected** (fall through to next step, do not exit)
2. `currentContainerId` set in config (via `use` command) → use that container
3. `--workspace <path>` / `CLAUDE_SANDBOX_WORKSPACE` → find containers matching that path in config
4. Neither provided → workspace defaults to `cwd` → find containers matching cwd in config
5. Exactly one candidate → auto-select
6. Multiple candidates → interactive prompt (inquirer list, see `use` command for list format)
7. No candidates → error: "No container found. Run `claude-code-sandbox start` to create one."

---

## `start`

Start the selected container. Creates a new one if none exists for the workspace.

```
claude-code-sandbox start [options]
```

| Flag                  | Env Var                    | Default                       | Description             |
| --------------------- | -------------------------- | ----------------------------- | ----------------------- |
| `-w, --workspace <p>` | `CLAUDE_SANDBOX_WORKSPACE` | cwd                           | Workspace to mount      |
| `--pull`              | —                          | false                         | Force pull latest image |
| `--image <image>`     | `CLAUDE_SANDBOX_IMAGE`     | `spiriyu/claude-code-sandbox` | Docker image name       |
| `--tag <tag>`         | `CLAUDE_SANDBOX_TAG`       | `latest`                      | Image tag               |
| `-d, --detach`        | `CLAUDE_SANDBOX_DETACH`    | false                         | Run in background       |

**Behavior:**

1. Validate workspace (must exist and be a directory, resolved to absolute path)
2. Sync Docker state for known containers
3. Find container for workspace in config
4. If `lastStatus === 'running'` → print status, exit (idempotent, not an error)
5. If container exists but stopped → `container.start()` via dockerode
6. If no container for workspace → generate UUID, create `ContainerRecord`, `docker.createContainer()` + `start()`
7. Save updated config
8. If `--detach` → print container ID and status; else → attach stdout/stderr to terminal (Ctrl+C detaches without killing)

**Validation:**

- Workspace: existing directory
- Image: valid Docker image name (`[registry/]name`, max 256 chars, `[a-z0-9._\-/]+`)
- Tag: `[a-zA-Z0-9._\-]+`, max 128 chars

---

## `stop`

Stop the selected container.

```
claude-code-sandbox stop [options]
```

Uses standard container selection (see above). No additional flags.

**Behavior:**

1. Resolve target container
2. Sync Docker state
3. If not running → info message and exit cleanly
4. `container.stop()` via dockerode
5. Update `lastStatus` in config

---

## `start-all`

Start all non-removed containers that are currently stopped.

```
claude-code-sandbox start-all
```

No container selection flags — operates on all.

**Behavior:**

1. Load all `ContainerRecord` where `removedAt === null`
2. Sync Docker states
3. For each container with `lastStatus !== 'running'`:
    - Attempt `container.start()`
    - Print ✓ or ✗ per container
4. Update config with new statuses
5. Summary: "Started N/M containers"

---

## `stop-all`

Stop all currently running containers.

```
claude-code-sandbox stop-all
```

No container selection flags.

**Behavior:**

1. Load all non-removed containers
2. Sync Docker states
3. For each `lastStatus === 'running'`:
    - `container.stop()`
    - Print ✓ or ✗ per container
4. Update config
5. Summary: "Stopped N containers"

---

## `remove`

Remove a container from Docker (frees disk space). Container is soft-deleted in config
(preserved in `history`).

```
claude-code-sandbox remove [options]
```

| Flag          | Description              |
| ------------- | ------------------------ |
| `-f, --force` | Skip confirmation prompt |

**Behavior:**

1. Resolve target container via standard selection
2. Unless `--force`: prompt "Remove container <id> for workspace <path>? [y/N]"
3. If `lastStatus === 'running'` → `container.stop()` first
4. `container.remove()` via dockerode
5. Set `removedAt = new Date().toISOString()` and `lastStatus = 'removed'` in config
6. Save config
7. Print: "✓ Container <short-id> removed. Run `claude-code-sandbox history` to view removed containers."

---

## `attach`

Attach the terminal to the container's **main process** (entrypoint — the Claude Code runner).
This lets you view output and interact with the running Claude Code session.

> Note: `attach` ≠ `shell`. `shell` (if kept) opens a new bash session via `docker exec`.
> `attach` connects to the existing main process via `docker attach`.

```
claude-code-sandbox attach [options]
```

Uses standard container selection.

**Behavior:**

1. Resolve target container
2. Sync Docker state — container must be `running` (error otherwise, with hint to run `start`)
3. Set terminal to raw mode (`process.stdin.setRawMode(true)`)
4. Call `container.attach({ stream: true, stdin: true, stdout: true, stderr: true })`
5. Pipe: `process.stdin → container.stdin`, `container.stdout/stderr → process.stdout`
6. Handle Ctrl+C: detach streams, restore terminal, exit 0 (container keeps running)
7. Handle container exit: restore terminal, print "Container exited", exit 1

---

## `ls`

List all active (non-removed) containers.

```
claude-code-sandbox ls [options]
```

| Flag     | Description          |
| -------- | -------------------- |
| `--json` | Output as JSON array |

**Output columns (table mode):**

```
ID        WORKSPACE                STATUS    IMAGE:TAG                   CREATED
a1b2c3d4  /home/user/myproject     running   claude-code-sandbox:latest  2h ago
b2c3d4e5  /home/user/otherapp      exited    claude-code-sandbox:latest  1d ago
```

**Behavior:**

1. Load config
2. Sync Docker states
3. Filter `removedAt === null`
4. Display table or JSON array

---

## `history`

List all containers including removed ones.

```
claude-code-sandbox history [options]
```

| Flag     | Description          |
| -------- | -------------------- |
| `--json` | Output as JSON array |

**Output columns (table mode):**

```
ID        WORKSPACE                STATUS    CREATED    REMOVED
a1b2c3d4  /home/user/myproject     running   2h ago     —
b2c3d4e5  /home/user/otherapp      removed   5d ago     1d ago
```

---

## `use`

Interactively select the active container. The selection is persisted to config as
`currentContainerId` and becomes the default target for all subsequent commands until changed
or cleared.

```
claude-code-sandbox use [id]
```

| Flag      | Description                 |
| --------- | --------------------------- |
| `--clear` | Clear the current selection |

**Behavior:**

1. Verify Docker is running (error if not)
2. If `id` argument provided → validate + set directly (skip interactive)
3. If no argument → show interactive list:
    - Query Docker for all containers managed by this CLI (from config)
    - Include containers that exist in Docker regardless of running/paused state
    - **Exclude containers that no longer exist in Docker** (only show Docker-confirmed ones)
    - Exclude removed containers (`removedAt !== null`)
4. User picks from list → save `currentContainerId` in config
5. With `--clear` → set `currentContainerId = null` in config

**Interactive list format:**

```
? Select a container: (Use arrow keys)
❯ a1b2c3d4  /home/user/proj1   running   started 2h ago
  b2c3d4e5  /home/user/proj2   exited    started 1d ago
  c3d4e5f6  /home/user/proj1   paused    started 3d ago
```

**`ls` marks the currently selected container with `*`:**

```
  ID        WORKSPACE           STATUS    IMAGE:TAG                   CREATED
* a1b2c3d4  /home/user/proj1    running   claude-code-sandbox:latest  2h ago
  b2c3d4e5  /home/user/proj2    exited    claude-code-sandbox:latest  1d ago
```

---

## `auth`

Manage authentication credentials. Unchanged from v0 but updated to use new config path.

```
claude-code-sandbox auth setup    # Interactive wizard
claude-code-sandbox auth status   # Show current credentials (masked)
```

Credentials are **never** stored in config — only in env vars or `~/.claude-code-sandbox/.env`.

---

## `config`

Manage CLI settings (defaults, image, tag, auth method).

```
claude-code-sandbox config list
claude-code-sandbox config get <key>
claude-code-sandbox config set <key> <value>
claude-code-sandbox config reset [key]
```

**Valid keys:**

| Key            | Default                       | Env Override           |
| -------------- | ----------------------------- | ---------------------- |
| `defaultImage` | `spiriyu/claude-code-sandbox` | `CLAUDE_SANDBOX_IMAGE` |
| `defaultTag`   | `latest`                      | `CLAUDE_SANDBOX_TAG`   |
| `authMethod`   | null                          | —                      |

---

## `help`

Show help. Equivalent to `--help`. Can show command-specific help.

```
claude-code-sandbox help [command]
```
