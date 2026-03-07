# Environment Variables

All CLI configuration has an environment variable override. Precedence:

```
CLI flag > environment variable > config file setting > built-in default
```

---

## Container Management

| Variable                   | Default                         | Description                                         |
|----------------------------|---------------------------------|-----------------------------------------------------|
| `CLAUDE_SANDBOX_CONFIG_DIR`| `~/.claude-code-sandbox`        | Directory containing `config.json` and `.env`       |
| `CLAUDE_SANDBOX_WORKSPACE` | `process.cwd()`                 | Workspace directory to mount (default workspace)    |
| `CLAUDE_SANDBOX_IMAGE`     | `spiriyu/claude-code-sandbox`   | Docker image name                                   |
| `CLAUDE_SANDBOX_TAG`       | `latest`                        | Docker image tag                                    |
| `CLAUDE_SANDBOX_DETACH`    | `false`                         | Run in detached mode by default (`"true"`/`"false"`)|

---

## Docker Connection

Dockerode picks these up automatically from the environment.

| Variable          | Default                   | Description                              |
|-------------------|---------------------------|------------------------------------------|
| `DOCKER_HOST`     | `/var/run/docker.sock`    | Docker daemon socket or TCP address      |
| `DOCKER_TLS_VERIFY` | —                       | Set to `1` to enable TLS verification    |
| `DOCKER_CERT_PATH`| —                         | Path to TLS certificates directory       |

---

## Authentication

| Variable                  | Default | Description                                          |
|---------------------------|---------|------------------------------------------------------|
| `ANTHROPIC_API_KEY`       | —       | Anthropic API key (prefix: `sk-ant-api03-`)          |
| `CLAUDE_CODE_OAUTH_TOKEN` | —       | Claude Code OAuth token (prefix: `sk-ant-oat01-`)    |

Auth resolution order:
1. `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` in environment
2. `~/.claude-code-sandbox/.env` file (parsed and injected)
3. Neither found → error, prompt to run `claude-code-sandbox auth setup`

---

## Validation Rules

| Variable                   | Validation Rule                                                          |
|----------------------------|--------------------------------------------------------------------------|
| `CLAUDE_SANDBOX_CONFIG_DIR`| Valid filesystem path; parent directory must exist; will be created      |
| `CLAUDE_SANDBOX_WORKSPACE` | Must be an existing directory (resolved to absolute path)                |
| `CLAUDE_SANDBOX_IMAGE`     | `[a-z0-9._\-/]+` (Docker image name format), max 256 chars              |
| `CLAUDE_SANDBOX_TAG`       | `[a-zA-Z0-9._\-]+`, max 128 chars                                        |
| `CLAUDE_SANDBOX_DETACH`    | Case-insensitive `"true"` or `"false"`                                   |
| `ANTHROPIC_API_KEY`        | Must start with `sk-ant-api03-`                                          |
| `CLAUDE_CODE_OAUTH_TOKEN`  | Must start with `sk-ant-oat01-`                                          |

---

## Usage Examples

```bash
# Use a custom config directory
CLAUDE_SANDBOX_CONFIG_DIR=~/work/.sandbox claude-code-sandbox ls

# Start a container for a specific workspace without cd
CLAUDE_SANDBOX_WORKSPACE=/home/user/myproject claude-code-sandbox start

# Use a specific image tag
CLAUDE_SANDBOX_TAG=node22-python3.12 claude-code-sandbox start

# Always run in detached mode
CLAUDE_SANDBOX_DETACH=true claude-code-sandbox start

# Use a remote Docker daemon
DOCKER_HOST=tcp://192.168.1.100:2376 DOCKER_TLS_VERIFY=1 claude-code-sandbox ls
```
