# Phase 2 — Dockerfile (Debian Slim)

## Goal
Create an optimized, production-ready Dockerfile based on Debian slim, replacing the Alpine POC.

## Why Debian Slim over Alpine
- Native glibc — no musl compatibility issues with Node.js or Python C extensions
- No need for unofficial Node.js builds mirror
- Better compatibility with Claude Code's native binaries
- Only ~30MB larger than Alpine base but avoids entire class of bugs

## Dockerfile Design

### Base: `debian:bookworm-slim`

### Layers (optimized for caching)

1. **System packages** — git, curl, build-essential, ripgrep, jq, vim, tmux, etc.
2. **Non-root user** — `dev` user with configurable UID/GID (build args)
3. **nvm + Node.js 22** — installed as `dev` user via official nvm
4. **pyenv + Python 3.13** — installed as `dev` user
5. **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
6. **Config** — copy `.claude.json` defaults
7. **Entrypoint** — configurable: either drop into Claude or bash

### Key Improvements over POC
- Use `debian:bookworm-slim` instead of `alpine:3.21`
- Use official Node.js builds (no unofficial mirror needed)
- Multi-stage or layer optimization for smaller final image
- Configurable entrypoint (don't hardcode `--dangerously-skip-permissions`)
- Entrypoint script that handles signal forwarding and graceful shutdown
- Proper `.bashrc` / `.profile` setup without echo chains (use heredocs or COPY)
- Health check instruction

### Build Args
| Arg | Default | Description |
|-----|---------|-------------|
| `USER_UID` | 1000 | Host user UID mapping |
| `USER_GID` | 1000 | Host user GID mapping |
| `NODE_VERSION` | 22 | Node.js major version |
| `PYTHON_VERSION` | 3.13 | Python version |

### Environment Variables (runtime)
| Var | Required | Description |
|-----|----------|-------------|
| `ANTHROPIC_API_KEY` | One of these | Anthropic API key |
| `CLAUDE_CODE_OAUTH_TOKEN` | One of these | OAuth token from claude.ai |

## Acceptance Criteria
- [ ] `docker build` succeeds
- [ ] Container starts and `claude --version` works
- [ ] `node --version`, `python --version` work
- [ ] Non-root user `dev` owns `/workspace`
- [ ] UID/GID build args work correctly
