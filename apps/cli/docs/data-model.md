# Data Model

## Config File Location

| | Path |
|--|------|
| Default | `~/.claude-code-sandbox/config.json` |
| Override | `CLAUDE_SANDBOX_CONFIG_DIR` env var |

The directory is created automatically on first use (mode `0700`).
The config file is created with an empty `containers` map on first use.

---

## Schema (version 1)

```typescript
interface ConfigFile {
  version: 1;
  containers: Record<string, ContainerRecord>;  // key = UUID
  settings: Settings;
}

interface ContainerRecord {
  id: string;            // UUID v4, e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  name: string;          // Docker container name: "claude-code-sandbox-a1b2c3d4"
  workspace: string;     // Absolute path, e.g. "/home/user/myproject"
  image: string;         // Docker image name, e.g. "spiriyu/claude-code-sandbox"
  tag: string;           // Docker image tag, e.g. "latest" or "node24-python3.13"
  createdAt: string;     // ISO 8601, set at container creation
  updatedAt: string;     // ISO 8601, updated on any state change
  lastStatus: ContainerStatus;
  removedAt: string | null;  // ISO 8601 when removed, null if active
}

type ContainerStatus =
  | 'created'   // Container created but never started
  | 'running'   // Currently running
  | 'paused'    // Paused
  | 'exited'    // Stopped cleanly
  | 'dead'      // Docker marked it as dead
  | 'removed'   // Removed from Docker
  | 'unknown';  // Not found in Docker (may have been removed externally)

interface Settings {
  defaultImage: string;            // default: "spiriyu/claude-code-sandbox"
  defaultTag: string;              // default: "latest"
  authMethod: string | null;       // "api_key" | "oauth_token" | null
  currentContainerId: string | null; // set by `use` command, null if none selected
}
```

---

## Example Config File

```json
{
  "version": 1,
  "containers": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "claude-code-sandbox-a1b2c3d4",
      "workspace": "/home/user/myproject",
      "image": "spiriyu/claude-code-sandbox",
      "tag": "latest",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "lastStatus": "running",
      "removedAt": null
    },
    "b2c3d4e5-f6a7-8901-bcde-f12345678901": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "claude-code-sandbox-b2c3d4e5",
      "workspace": "/home/user/otherapp",
      "image": "spiriyu/claude-code-sandbox",
      "tag": "node22-python3.12",
      "createdAt": "2024-01-10T09:00:00.000Z",
      "updatedAt": "2024-01-12T15:30:00.000Z",
      "lastStatus": "removed",
      "removedAt": "2024-01-12T15:30:00.000Z"
    }
  },
  "settings": {
    "defaultImage": "spiriyu/claude-code-sandbox",
    "defaultTag": "latest",
    "authMethod": "api_key",
    "currentContainerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

## Short ID

The short ID is the first 8 characters of the UUID (the segment before the first `-`).

Uses:
- Docker container name: `claude-code-sandbox-<short-id>`
- `ls` / `history` display (truncated for readability)
- `--id <short-id>` flag (prefix-match lookup)

Collision probability with 8 hex chars (4B possibilities) is negligible for the expected number
of containers per user.

---

## Config Store Layer

### `lib/config-store.ts`

Low-level JSON file operations. All functions are synchronous (no async complexity for a CLI).

```typescript
// Load config from disk. Creates defaults if file/dir doesn't exist.
function load(configDir: string): ConfigFile

// Atomically save config (write temp file → rename).
function save(config: ConfigFile, configDir: string): void

// Migrate older config versions to current schema.
function migrate(raw: unknown): ConfigFile
```

### `lib/container-store.ts`

Higher-level container record CRUD. Wraps `config-store`.

```typescript
function getAll(config: ConfigFile, includeRemoved?: boolean): ContainerRecord[]

function findById(config: ConfigFile, id: string): ContainerRecord | undefined
// Matches full UUID or short-ID prefix (case-insensitive)

function findByWorkspace(config: ConfigFile, workspace: string): ContainerRecord | undefined
// Matches absolute resolved path

function add(config: ConfigFile, record: ContainerRecord): void

function update(config: ConfigFile, id: string, patch: Partial<ContainerRecord>): void

function markRemoved(config: ConfigFile, id: string): void
// Sets removedAt + lastStatus = 'removed'

function syncStatus(
  config: ConfigFile,
  dockerStates: Map<string, ContainerStatus>
): void
// Bulk update lastStatus from Docker query results
// Key = Docker container name
```

---

## Per-Container `.claude` Directory Mount

Each container gets a dedicated `.claude` directory on the host, mounted into the container.
This persists Claude Code's own configuration, memory, and session data across container
restarts.

| Side      | Path                                                      |
|-----------|-----------------------------------------------------------|
| Host      | `~/.claude-code-sandbox/containers/<short-id>/.claude`    |
| Container | `/home/dev/.claude`                                       |

The container image runs as the `dev` user (`/home/dev`). Claude Code stores its config and
memory under that user's home. The host directory is created automatically when the container
is first created.

**Example** for container `a1b2c3d4`:
- Host: `~/.claude-code-sandbox/containers/a1b2c3d4/.claude`
- Container: `/home/dev/.claude`

This directory is created alongside `config.json` in the config directory tree:
```
~/.claude-code-sandbox/
├── config.json
├── .env                          # auth credentials (chmod 600)
└── containers/
    ├── a1b2c3d4/
    │   └── .claude/              # Claude Code config/memory for this sandbox
    └── b2c3d4e5/
        └── .claude/
```

---

## Auth Credentials Storage

Credentials are **never** stored in `config.json`. They live in:

1. Environment variables: `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`
2. `~/.claude-code-sandbox/.env` file (chmod 600)

The `.env` file sits alongside `config.json` in the config directory.

---

## Schema Migration

`config-store.load()` calls `migrate()` on the raw JSON before returning. Migration rules:

| From version | To version | Action |
|--------------|------------|--------|
| (no file)    | 1          | Create empty defaults |
| 1            | 1          | No-op (current version) |

Future versions increment `version` and add transformation logic in `migrate()`.
