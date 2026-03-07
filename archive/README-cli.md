# @claude-code-sandbox/cli

> CLI for managing the [Claude Code sandbox](https://github.com/your-username/claude-code-sandbox-docker-hub) Docker container.

## Install

```bash
npm install -g @claude-code-sandbox/cli
```

Or use without installing:

```bash
npx @claude-code-sandbox/cli <command>
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- A Claude credential — either:
  - `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com/settings/keys)
  - `CLAUDE_CODE_OAUTH_TOKEN` from a Claude Pro/Max subscription

## Quick Start

```bash
# 1. Set up credentials (first time only)
claude-code-sandbox auth

# 2. Start the sandbox (mounts current directory as /workspace)
claude-code-sandbox start

# 3. Check status
claude-code-sandbox status

# 4. Stop the sandbox
claude-code-sandbox stop
```

## Commands

### `claude-code-sandbox start`

Starts the sandbox container. Mounts the current directory as `/workspace`.

```bash
claude-code-sandbox start                    # Start with cwd as workspace
claude-code-sandbox start -w ~/my-project   # Use a specific workspace path
claude-code-sandbox start --pull            # Force pull latest image first
claude-code-sandbox start -d                # Run in background (detach)
```

### `claude-code-sandbox stop`

Stops the running container.

```bash
claude-code-sandbox stop        # Stop container
claude-code-sandbox stop --rm   # Stop and remove the container
```

### `claude-code-sandbox status`

Shows the current container state.

```bash
claude-code-sandbox status        # Pretty output
claude-code-sandbox status --json # Machine-readable JSON
```

### `claude-code-sandbox shell`

Opens a bash shell inside the running container.

```bash
claude-code-sandbox shell
```

### `claude-code-sandbox auth`

Interactive wizard to set up Claude credentials.

```bash
claude-code-sandbox auth          # Run setup wizard
claude-code-sandbox auth setup    # Same as above
claude-code-sandbox auth status   # Show current credentials
```

### `claude-code-sandbox config`

Manage persistent settings (stored at `~/.claude-code-sandbox/config.json`).

```bash
claude-code-sandbox src list              # Show all settings
claude-code-sandbox src get imageName     # Get a value
claude-code-sandbox src set imageName your-username/claude-code-sandbox  # Set a value
claude-code-sandbox src reset             # Reset all to defaults
claude-code-sandbox src reset imageName   # Reset one key to default
```

**Config keys:**

| Key | Default | Description |
|-----|---------|-------------|
| `imageName` | `your-username/claude-code-sandbox` | Docker image to use |
| `imageTag` | `latest` | Image tag |
| `containerName` | `claude-code-sandbox` | Container name |
| `workspacePath` | _(current directory)_ | Default workspace mount |
| `authMethod` | `null` | Preferred auth method |

## Credentials

Credentials are **never** stored in the config file. They are read from:

1. Environment variables (`ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`)
2. `~/.claude-code-sandbox/.env` — created by `claude-code-sandbox auth` (chmod 600)

## Publishing

See [PUBLISHING.md](./PUBLISHING.md) for npm publishing steps.

## License

MIT
