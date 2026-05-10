# Docker Image — claude-code-sandbox

Source: `apps/docker/`
Docker Hub: `spiriyu/claude-code-sandbox`

## Local Build

```bash
cd apps/docker

# Build with your host UID/GID (prevents file permission issues on mounted volumes)
docker build -f image/Dockerfile \
  --build-arg USER_UID=$(id -u) \
  --build-arg USER_GID=$(id -g) \
  -t claude-code-sandbox .

# Run with API key
docker run -it --rm \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v $(pwd):/workspace \
  claude-code-sandbox

# Run with OAuth token
docker run -it --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-... \
  -v $(pwd):/workspace \
  claude-code-sandbox

# Drop into bash instead of Claude (skip entrypoint CMD)
docker run -it --rm \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v $(pwd):/workspace \
  claude-code-sandbox bash -l
```

Via NX:

```bash
nx run docker:build   # runs the build command above
```

## File Layout

```
apps/docker/
├── image/
│   ├── Dockerfile               # Main image definition
│   └── src/
│       ├── entrypoint.sh        # Auth gate — validates credentials then execs CMD
│       ├── .claude.json         # Bootstrap config (skips onboarding prompts)
│       └── profile.d/
│           ├── nvm.sh           # Loaded by login shells — exports NVM_DIR, loads nvm
│           └── pyenv.sh         # Loaded by login shells — exports PYENV_ROOT, inits pyenv
├── scripts/
│   └── generate-matrix.js       # Reads versions.json → CI build matrix JSON
├── .dockerignore
└── DOCKERHUB_OVERVIEW.md        # Docker Hub page description (update on each release)
```

## Build Arguments

| Arg              | Default | Description                                                              |
| ---------------- | ------- | ------------------------------------------------------------------------ |
| `USER_UID`       | `1000`  | UID for the `dev` user (match your host user to avoid permission issues) |
| `USER_GID`       | `1000`  | GID for the `dev` user (handles GID collisions like macOS GID 20)        |
| `NODE_VERSION`   | `22`    | Node.js version installed via nvm                                        |
| `PYTHON_VERSION` | `3.13`  | Python version installed via pyenv                                       |

## Dockerfile Layer Order

The Dockerfile is structured to maximize Docker layer caching:

```
1. FROM debian:bookworm-slim
2. System packages (apt-get) — changes rarely, cached aggressively
3. Locale (en_US.UTF-8)
4. Non-root user (dev, UID/GID from build args)
5. Workspace (/workspace, owned by dev)
6. Shell profiles (COPY profile.d/ → /etc/profile.d/)
7. Entrypoint script (COPY + chmod)
8. USER dev  ← all tool installs run as dev from here
9. nvm + Node.js  (most expensive, cached per NODE_VERSION)
10. pyenv + Python (expensive, cached per PYTHON_VERSION)
11. Claude Code CLI (npm install -g @anthropic-ai/claude-code)
12. Bootstrap config (COPY .claude.json)
13. WORKDIR /workspace
14. HEALTHCHECK
15. ENTRYPOINT + CMD
```

## Entrypoint Behaviour (`image/src/entrypoint.sh`)

The entrypoint runs before the container's CMD. It:

1. Checks for `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` (at least one must be non-empty)
2. If neither is set, prints instructions and `exit 1`
3. Applies `GIT_USER_NAME` / `GIT_USER_EMAIL` to global git config if set
4. If `SANDBOX_INIT_SCRIPT` is set and its target exists, runs it **exactly once** per container. A marker file `/home/dev/.claude/.claude-code-sandbox/.init-done` is written on success so subsequent restarts skip it.
5. Enters the main loop. On every iteration:
    - If `SANDBOX_LOOP_SCRIPT` is set and its target exists, runs it (non-fatal on failure)
    - Runs `claude update`
    - Execs CMD (default: `claude --dangerously-skip-permissions`)
    - On exit, sleeps 2s and restarts — container stays alive between Claude sessions

### Sandbox config hooks

The CLI populates `/home/dev/.claude/.claude-code-sandbox/` by **copying** files from the host (never bind-mounting), so container-side edits are isolated per container. The CLI sets these env vars when the corresponding script is present:

| Env var               | Target path                                      | When it runs        |
| --------------------- | ------------------------------------------------ | ------------------- |
| `SANDBOX_INIT_SCRIPT` | `/home/dev/.claude/.claude-code-sandbox/init.sh` | Once, on first boot |
| `SANDBOX_LOOP_SCRIPT` | `/home/dev/.claude/.claude-code-sandbox/loop.sh` | Every loop iter     |

See [`docs/cli.md`](cli.md#sandbox-config-hooks) for how to author these files.

Default CMD: `bash -lc "claude --dangerously-skip-permissions"`

The `--dangerously-skip-permissions` flag is safe inside the container because Claude Code is isolated from your host system. It only touches files in `/workspace`.

## Shell Profiles

Login shells (`bash -l`) automatically source two files from `/etc/profile.d/`:

**`nvm.sh`** — exports `NVM_DIR=/home/dev/.nvm`, sources `nvm.sh` and bash completion. Safe to source when nvm is absent.

**`pyenv.sh`** — exports `PYENV_ROOT=/home/dev/.pyenv`, prepends pyenv to `PATH`, runs `pyenv init`. Safe to source when pyenv is absent.

These are copied from `apps/docker/image/src/profile.d/` at build time.

## Key Paths Inside the Container

| Path                      | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `/workspace`              | Mounted project directory — `WORKDIR` default          |
| `/home/dev/.nvm`          | nvm installation + Node.js versions                    |
| `/home/dev/.pyenv`        | pyenv installation + Python versions                   |
| `/home/dev/.claude.json`  | Bootstrap config (sets `hasCompletedOnboarding: true`) |
| `/entrypoint.sh`          | Auth gate                                              |
| `/etc/profile.d/nvm.sh`   | nvm loader for login shells                            |
| `/etc/profile.d/pyenv.sh` | pyenv loader for login shells                          |

## Bootstrap Config (`.claude.json`)

`image/src/.claude.json` is copied to `/home/dev/.claude.json` inside the container. It pre-populates Claude Code's startup state to skip the onboarding wizard:

```json
{
  "numStartups": 1,
  "hasCompletedOnboarding": true,
  "tipsHistory": { ... }
}
```

This file contains no personal data and no credentials.

## Conventions

- The `dev` user must always own `/workspace` — enforced in the `RUN mkdir -p /workspace` step
- All tool installs (nvm, pyenv, Claude Code) happen under `USER dev` to ensure correct ownership
- Never hardcode credentials in the Dockerfile or any committed file
- Keep the image lean — only install packages needed at runtime

## Docker Compose

For persistent or team setups, create a `docker-compose.yml` next to your project:

```yaml
services:
    claude-code-sandbox:
        image: spiriyu/claude-code-sandbox
        container_name: claude-code-sandbox
        stdin_open: true
        tty: true
        restart: unless-stopped
        environment:
            - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
        volumes:
            - .:/workspace
```

```bash
docker compose up -d
docker attach claude-code-sandbox   # attach to the Claude session
docker compose down
```
