# Phase 5 — CLI Auth Command

## Goal
Implement the `auth` command that guides users through obtaining and configuring their Claude credentials.

## Commands

### `claude-code-sandbox auth`
Interactive wizard that:
1. Explains the two auth methods:
   - **API Key** (`ANTHROPIC_API_KEY`) — from console.anthropic.com
   - **OAuth Token** (`CLAUDE_CODE_OAUTH_TOKEN`) — from claude.ai Pro/Max subscription
2. Asks user which method they want to use
3. Guides them step-by-step

### `claude-code-sandbox auth setup`
Same as `claude-code-sandbox auth` — the interactive wizard.

### `claude-code-sandbox auth status`
- Show which auth method is configured
- Validate the token/key format (not API call, just format check)
- Show where it's stored (env var vs config)

### API Key Flow
1. Print step-by-step instructions:
   - Go to https://console.anthropic.com/settings/keys
   - Create a new API key
   - Copy the key (starts with `sk-ant-api03-...`)
2. Prompt user to paste the key
3. Validate format (`sk-ant-api03-` prefix)
4. Ask how to store it:
   - [A] Export in current shell (ephemeral)
   - [B] Save to `~/.claude-code-sandbox/.env` (persistent, loaded by CLI)
   - [C] Just show the docker run command with the key

### OAuth Token Flow
1. Print step-by-step instructions:
   - Requires Claude Pro/Max subscription on claude.ai
   - Run `claude login` or use the Claude Code OAuth flow
   - The token starts with `sk-ant-oat01-...`
2. Prompt user to paste the token
3. Validate format (`sk-ant-oat01-` prefix)
4. Same storage options as API key

### Security
- Never log or display full tokens (mask middle characters)
- `.env` file gets `chmod 600`
- Warn users not to commit tokens to git

## Acceptance Criteria
- [ ] `claude-code-sandbox auth` walks through the wizard
- [ ] `claude-code-sandbox auth status` shows current auth config
- [ ] Tokens are masked in all output
- [ ] `.env` file has restrictive permissions
