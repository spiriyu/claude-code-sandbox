# Phase 6 — CLI Config Command

## Goal
Implement the `config` command for viewing and managing persistent settings.

## Commands

### `claude-code-sandbox config list`
- Print all current config values in a table
- Show defaults vs user-set values
- `--json` for machine-readable output

### `claude-code-sandbox config set <key> <value>`
- Set a config value
- Validate key exists in schema
- Validate value type/format
- Example: `claude-code-sandbox config set workspacePath /home/user/projects`

### `claude-code-sandbox config get <key>`
- Get a single config value

### `claude-code-sandbox config reset [key]`
- Reset a key to default, or reset all if no key specified
- Confirm before resetting all

### Config Keys
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `imageName` | string | `<user>/claude-code-sandbox` | Docker image name |
| `imageTag` | string | `latest` | Docker image tag |
| `containerName` | string | `claude-code-sandbox` | Container name |
| `workspacePath` | string | (cwd) | Default workspace mount path |
| `authMethod` | enum | `null` | Preferred auth: `api_key` or `oauth_token` |

## Acceptance Criteria
- [ ] `config list` shows all settings
- [ ] `config set/get` read/write individual values
- [ ] `config reset` restores defaults
- [ ] Invalid keys/values are rejected with clear errors
