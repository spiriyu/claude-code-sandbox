# Phase 4 — CLI Container Lifecycle Commands

## Goal
Implement `start`, `stop`, `status`, and `shell` commands.

## Commands

### `claude-code-sandbox start`
1. Check Docker is installed and running
2. Pull image if not present locally (or if `--pull` flag)
3. Check if container already exists/running
4. Prompt for auth credentials if not set (env var or config)
5. Start container with:
   - Workspace volume mount (`-v <host-path>:/workspace`)
   - Auth env vars passed through
   - Container name from config
   - TTY + stdin for interactive use
6. Options:
   - `--workspace <path>` — override workspace directory (default: cwd)
   - `--pull` — force pull latest image
   - `--detach` / `-d` — run in background
   - `--auth-method <api_key|oauth>` — override auth method

### `claude-code-sandbox stop`
1. Check container exists and is running
2. Graceful stop (SIGTERM, wait 10s, then SIGKILL)
3. Optionally remove container (`--rm` flag)

### `claude-code-sandbox status`
1. Show container state (running/stopped/not found)
2. Show image version
3. Show workspace mount
4. Show uptime
5. `--json` flag for machine-readable output

### `claude-code-sandbox shell`
1. Check container is running
2. `docker exec -it <name> bash -l`
3. If not running, offer to start it first

## Acceptance Criteria
- [ ] `claude-code-sandbox start` pulls image and starts container
- [ ] `claude-code-sandbox stop` cleanly stops the container
- [ ] `claude-code-sandbox status` shows accurate container info
- [ ] `claude-code-sandbox shell` drops into bash inside container
- [ ] Auth credentials are passed through correctly
