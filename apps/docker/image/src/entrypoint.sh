#!/bin/bash
# ============================================================
# Entrypoint for claude-code-sandbox
#
# Validates auth credentials are present, then execs the
# requested command (default: claude --dangerously-skip-permissions)
# ============================================================
set -e

# Validate auth — at least one credential must be present
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  echo ""
  echo "  Error: No Claude credentials found."
  echo ""
  echo "  Set one of the following environment variables:"
  echo "    ANTHROPIC_API_KEY        — from https://console.anthropic.com/settings/keys"
  echo "    CLAUDE_CODE_OAUTH_TOKEN  — from Claude Pro/Max (run: claude login)"
  echo ""
  echo "  Example:"
  echo "    docker run -e ANTHROPIC_API_KEY=sk-ant-... your-username/claude-code-sandbox"
  echo ""
  echo "  Or use the CLI helper: npx @claude-code-sandbox/cli start"
  echo ""
  exit 1
fi

# Configure git identity if provided
if [ -n "${GIT_USER_NAME:-}" ]; then
  git config --global user.name "${GIT_USER_NAME}"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
  git config --global user.email "${GIT_USER_EMAIL}"
fi

# Remove marketplace invalid arguments
#necp ~/.claude.json ~/.claude.json.bak && jq 'with_entries(select(.key | startswith("officialMarketplace") | not))' ~/.claude.json.bak > ~/.claude.json

# Run user-provided on-create init script exactly once per container.
# The marker lives inside the per-container .claude-code-sandbox/ dir, so it
# survives restarts but is unique to this container.
SANDBOX_CONFIG_DIR="$HOME/.claude/.claude-code-sandbox"
SANDBOX_INIT_MARKER="$SANDBOX_CONFIG_DIR/.init-done"
if [ -n "${SANDBOX_INIT_SCRIPT:-}" ] && [ -f "${SANDBOX_INIT_SCRIPT}" ] && [ ! -f "${SANDBOX_INIT_MARKER}" ]; then
  echo "[sandbox] running init.sh (one-time)..."
  bash "${SANDBOX_INIT_SCRIPT}" || echo "[sandbox] init.sh exited with $?"
  mkdir -p "${SANDBOX_CONFIG_DIR}"
  touch "${SANDBOX_INIT_MARKER}"
fi

# Loop: restart the command after it exits so the container stays alive
# between Claude sessions. Use Ctrl-C twice quickly to break out.
while true; do
  # Run user-provided on-loop script on every iteration so the user can
  # re-apply config changes to a live container without re-creating it.
  if [ -n "${SANDBOX_LOOP_SCRIPT:-}" ] && [ -f "${SANDBOX_LOOP_SCRIPT}" ]; then
    bash "${SANDBOX_LOOP_SCRIPT}" || echo "[sandbox] loop.sh exited with $?"
  fi
  claude update
  "$@"
  exit_code=$?
  echo ""
  echo "  Session exited (code $exit_code). Starting a new session in 2s..."
  echo "  Press Ctrl-C to stop the container."
  echo ""
  sleep 2
done
