# Authentication

## Supported Methods

| Method      | Env Variable              | Token Prefix    | Source                                                                             |
| ----------- | ------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| API Key     | `ANTHROPIC_API_KEY`       | `sk-ant-api03-` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| OAuth Token | `CLAUDE_CODE_OAUTH_TOKEN` | `sk-ant-oat01-` | Claude Pro/Max subscription — run `claude login` on your host                      |

Either method grants full Claude Code access. API keys are pay-per-token; OAuth tokens require an active Claude Pro or Max subscription.

## Credential Resolution Order

When the CLI starts a container, `resolveAuth()` in `apps/cli/src/commands/auth.ts` checks sources in this order:

1. **Environment variables** — `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` in the current shell
2. **`~/.claude-code-sandbox/.env`** — file created by `claude-code-sandbox auth` (chmod 600)

The first non-empty credential found is passed to the container via `-e ANTHROPIC_API_KEY=...` or `-e CLAUDE_CODE_OAUTH_TOKEN=...`.

If neither is found, the command exits with an error and prompts the user to run `claude-code-sandbox auth`.

## Setting Up Credentials

### Interactive wizard (recommended)

```bash
claude-code-sandbox auth
```

The wizard:

1. Asks which method (API Key or OAuth Token)
2. Prints step-by-step instructions for obtaining the credential
3. Prompts for the token (masked input)
4. Validates the prefix (warns but continues if wrong — tokens may still work)
5. Offers to save to `~/.claude-code-sandbox/.env` or show an `export` command

### Manual setup

```bash
# Option A: environment variable (session-only)
export ANTHROPIC_API_KEY=sk-ant-api03-...
claude-code-sandbox start

# Option B: persistent file
mkdir -p ~/.claude-code-sandbox
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > ~/.claude-code-sandbox/.env
chmod 600 ~/.claude-code-sandbox/.env
```

## Auth Status

```bash
claude-code-sandbox auth status
```

Shows:

- Which method is active (`ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`)
- Masked token (first 10 chars + `***` + last 4 chars)
- Where the credential comes from (env var or `.env` file path)

## Security Model

| What             | Where stored                                    | Who can read      |
| ---------------- | ----------------------------------------------- | ----------------- |
| Auth token       | Env var or `~/.claude-code-sandbox/.env` (chmod 600) | Current user only |
| Config settings  | `~/.claude-code-sandbox/config.json`                 | Current user      |
| **Never** stored | `conf` config store                             | —                 |

The `conf` config store (`~/.claude-code-sandbox/config.json`) deliberately never contains credentials. `claude-code-sandbox config list` is safe to share.

## Inside the Container

The entrypoint (`/entrypoint.sh`) performs a second validation check before starting Claude Code:

```bash
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  echo "Error: No Claude credentials found."
  exit 1
fi
exec "$@"
```

This means even if a container is started manually via `docker run` without credentials, it will fail gracefully rather than starting Claude Code without auth.

## Token Validation

The CLI validates token prefixes client-side as a sanity check:

- `ANTHROPIC_API_KEY` must start with `sk-ant-api03-`
- `CLAUDE_CODE_OAUTH_TOKEN` must start with `sk-ant-oat01-`

If the prefix doesn't match, the wizard shows a warning but still saves the token. The actual authentication is validated by the Anthropic API when Claude Code starts.

## Getting an OAuth Token

If you have a Claude Pro/Max subscription:

1. Install Claude Code on your host: `npm install -g @anthropic-ai/claude-code`
2. Run `claude login` and complete the browser OAuth flow
3. The token is saved to `~/.claude/.credentials.json`
4. Copy the `claudeAiOauthToken` value from that file
5. Use it as `CLAUDE_CODE_OAUTH_TOKEN`

Or let the wizard guide you: `claude-code-sandbox auth` → select "OAuth Token".
