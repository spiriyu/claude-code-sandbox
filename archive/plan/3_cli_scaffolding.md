# Phase 3 — CLI Scaffolding & Core Library

## Goal
Build the CLI entry point, command router, and shared libraries (Docker helpers, config store, logger).

## Implementation

### Entry Point (`src/cli.ts`)
- Use `commander` to define the CLI program
- Register all subcommands
- Global options: `--verbose`, `--json` (machine-readable output)
- Version from `package.json`

### Docker Helpers (`src/lib/docker.ts`)
- `isDockerInstalled()` — check `docker` binary exists
- `isDockerRunning()` — check Docker daemon is responsive
- `getContainerStatus(name)` — inspect container state
- `pullImage(image, tag)` — pull with progress
- `runContainer(opts)` — create and start container
- `stopContainer(name)` — graceful stop
- `removeContainer(name)` — remove
- `execInContainer(name, cmd)` — exec interactive
- All functions shell out to `docker` CLI (no Docker SDK dependency — keeps it lightweight)

### Config Store (`src/lib/config.ts`)
- Use `conf` package for persistent JSON config in `~/.claude-code-sandbox/config.json`
- Schema:
  ```
  {
    imageName: string        // default: "<user>/claude-code-sandbox"
    imageTag: string         // default: "latest"
    containerName: string    // default: "claude-code-sandbox"
    workspacePath: string    // default: process.cwd()
    authMethod: "api_key" | "oauth_token" | null
    defaultModel: string     // optional
  }
  ```

### Constants (`src/lib/constants.ts`)
- `DEFAULT_IMAGE` — Docker Hub image name
- `DEFAULT_CONTAINER_NAME`
- `DEFAULT_NODE_VERSION`, `DEFAULT_PYTHON_VERSION`

### Logger (`src/utils/logger.ts`)
- Thin wrapper around `chalk` + `ora`
- Methods: `info`, `success`, `warn`, `error`, `spinner`

## Acceptance Criteria
- [ ] `claude-code-sandbox --help` shows all commands
- [ ] `claude-code-sandbox --version` prints version
- [ ] Config file is created on first run at `~/.claude-code-sandbox/config.json`
- [ ] Docker availability check works
