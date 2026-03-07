#!/bin/bash
# =============================================================
# E2E tests for @claude-code-sandbox/cli
# Requires Docker installed and the sandbox image available.
#
# Usage:
#   bash test/e2e.sh
#
# Prerequisites:
#   - npm run build (CLI must be built)
#   - Docker installed and running
#   - Sandbox image available (docker pull or build from docker-hub repo)
#
# Environment:
#   IMAGE_NAME   Override image (default: from src)
#   AUTH_KEY     Fake API key for testing (default: test-key-for-e2e)
# =============================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/.."
CLI="node $REPO_DIR/dist/cli.mjs"
AUTH_KEY="${AUTH_KEY:-test-key-for-e2e}"
CONTAINER_NAME="claude-code-sandbox-e2e-$$"

PASS=0
FAIL=0

pass() { ((PASS++)); echo "  PASS: $1"; }
fail() { ((FAIL++)); echo "  FAIL: $1"; }

# Run CLI command, capture stdout + stderr, get exit code
run_cli() {
  local out rc
  out=$(ANTHROPIC_API_KEY="$AUTH_KEY" $CLI "$@" 2>&1) && rc=0 || rc=$?
  echo "$out"
  return $rc
}

cleanup() {
  # Restore original src
  if [ -n "${ORIGINAL_CONTAINER_NAME:-}" ]; then
    $CLI src set containerName "$ORIGINAL_CONTAINER_NAME" &>/dev/null || true
  fi
  # Kill any test container
  docker rm -f "$CONTAINER_NAME" &>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "=== CLI E2E Tests ==="
echo ""

# ---- Check built CLI exists ----
if [ ! -f "$REPO_DIR/dist/cli.mjs" ]; then
  echo "ERROR: CLI not built. Run 'npm run build' first."
  exit 1
fi

# ================================================================
# SECTION 1: Offline tests (no Docker required)
# ================================================================
echo "--- Section 1: Offline (no Docker) ---"
echo ""

# 1. --version
output=$(run_cli --version) && rc=0 || rc=$?
if [ "$rc" -eq 0 ] && echo "$output" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then
  pass "--version prints semver ($output)"
else
  fail "--version (exit $rc, output: $output)"
fi

# 2. --help
output=$(run_cli --help) && rc=0 || rc=$?
if echo "$output" | grep -q "start" && echo "$output" | grep -q "config"; then
  pass "--help lists commands"
else
  fail "--help (output: $output)"
fi

# 3. src list --json
output=$(run_cli src list --json) && rc=0 || rc=$?
if [ "$rc" -eq 0 ] && echo "$output" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "config list --json returns valid JSON"
else
  fail "config list --json (exit $rc)"
fi

# 4. src set / get roundtrip
ORIGINAL_CONTAINER_NAME=$(run_cli src get containerName)
run_cli src set containerName "$CONTAINER_NAME" &>/dev/null
output=$(run_cli src get containerName)
if [ "$output" = "$CONTAINER_NAME" ]; then
  pass "config set/get roundtrip"
else
  fail "config set/get (expected $CONTAINER_NAME, got $output)"
fi

# 5. src reset
run_cli src reset containerName &>/dev/null
output=$(run_cli src get containerName)
if [ "$output" = "claude-code-sandbox" ]; then
  pass "config reset restores default"
else
  fail "config reset (expected claude-code-sandbox, got $output)"
fi

# 6. src get rejects unknown key
output=$(run_cli src get fakeKey 2>&1) && rc=0 || rc=$?
if [ "$rc" -ne 0 ]; then
  pass "config get rejects unknown key"
else
  fail "config get should reject unknown key"
fi

# 7. auth status
output=$(run_cli auth status) && rc=0 || rc=$?
if [ "$rc" -eq 0 ] && echo "$output" | grep -q "ANTHROPIC_API_KEY"; then
  pass "auth status detects env var"
else
  fail "auth status (exit $rc, output: $output)"
fi

# ================================================================
# SECTION 2: Docker tests (require Docker + image)
# ================================================================
echo ""
echo "--- Section 2: Docker lifecycle ---"
echo ""

if ! command -v docker &>/dev/null; then
  echo "SKIP: Docker is not installed. Section 2 skipped."
  echo ""
  TOTAL=$((PASS + FAIL))
  echo "=== Results: $PASS/$TOTAL passed, $FAIL failed (Docker tests skipped) ==="
  [ "$FAIL" -eq 0 ]
  exit $?
fi

if ! docker info &>/dev/null; then
  echo "SKIP: Docker daemon is not running. Section 2 skipped."
  echo ""
  TOTAL=$((PASS + FAIL))
  echo "=== Results: $PASS/$TOTAL passed, $FAIL failed (Docker tests skipped) ==="
  [ "$FAIL" -eq 0 ]
  exit $?
fi

# Set container name to our test name
run_cli src set containerName "$CONTAINER_NAME" &>/dev/null

# 8. status when no container exists
output=$(run_cli status --json) && rc=0 || rc=$?
if [ "$rc" -eq 0 ] && echo "$output" | grep -q '"exists":false'; then
  pass "status shows 'not found' when no container"
else
  # If --json didn't return JSON, try plain status
  output=$(run_cli status) && rc=0 || rc=$?
  if [ "$rc" -eq 0 ] && echo "$output" | grep -qi "not found"; then
    pass "status shows 'not found' when no container"
  else
    fail "status should show not found (exit $rc)"
  fi
fi

# 9. Create a test container manually (to test status/stop without needing the sandbox image)
IMAGE_NAME=$(run_cli src get imageName)
IMAGE_TAG=$(run_cli src get imageTag)

# Try to use the real sandbox image, fall back to debian:bookworm-slim
if docker image inspect "$IMAGE_NAME:$IMAGE_TAG" &>/dev/null; then
  TEST_IMAGE="$IMAGE_NAME:$IMAGE_TAG"
  echo "Using sandbox image: $TEST_IMAGE"
else
  TEST_IMAGE="debian:bookworm-slim"
  echo "Sandbox image not found — using $TEST_IMAGE for lifecycle tests"
  docker pull "$TEST_IMAGE" &>/dev/null
fi

docker run -d --name "$CONTAINER_NAME" "$TEST_IMAGE" sleep 300 &>/dev/null && rc=0 || rc=$?
if [ "$rc" -eq 0 ]; then
  pass "Test container started"
else
  fail "Could not start test container"
  echo "--- Cannot continue Docker tests ---"
  TOTAL=$((PASS + FAIL))
  echo ""
  echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="
  [ "$FAIL" -eq 0 ]
  exit $?
fi

# 10. status shows running
output=$(run_cli status --json) && rc=0 || rc=$?
if [ "$rc" -eq 0 ] && echo "$output" | grep -q '"running":true'; then
  pass "status shows running"
else
  fail "status should show running (output: $output)"
fi

# 11. stop works
output=$(run_cli stop) && rc=0 || rc=$?
if [ "$rc" -eq 0 ]; then
  pass "stop exits 0"
else
  fail "stop (exit $rc, output: $output)"
fi

# 12. container is gone after stop
sleep 1
output=$(run_cli status --json) && rc=0 || rc=$?
if echo "$output" | grep -q '"running":false\|"exists":false'; then
  pass "Container stopped after 'stop'"
else
  fail "Container should be stopped (output: $output)"
fi

# 13. stop on non-existent container is graceful
docker rm -f "$CONTAINER_NAME" &>/dev/null
output=$(run_cli stop 2>&1) && rc=0 || rc=$?
if [ "$rc" -eq 0 ]; then
  pass "stop on non-existent container is graceful"
else
  fail "stop on non-existent (exit $rc)"
fi

# 14. start --detach with sandbox image (only if available)
if [ "$TEST_IMAGE" = "$IMAGE_NAME:$IMAGE_TAG" ]; then
  echo ""
  echo "--- Full lifecycle with sandbox image ---"

  run_cli src set containerName "$CONTAINER_NAME" &>/dev/null
  output=$(ANTHROPIC_API_KEY="$AUTH_KEY" $CLI start -d 2>&1) && rc=0 || rc=$?
  if [ "$rc" -eq 0 ]; then
    pass "start -d succeeds"
  else
    fail "start -d (exit $rc, output: $output)"
  fi

  sleep 2

  output=$(run_cli status --json) && rc=0 || rc=$?
  if echo "$output" | grep -q '"running":true'; then
    pass "Container running after start -d"
  else
    fail "Container not running after start -d"
  fi

  # Workspace mount test
  TMPDIR=$(mktemp -d)
  echo "cli-mount-test" > "$TMPDIR/probe.txt"
  # Start a second container with workspace mount
  MOUNT_CONTAINER="$CONTAINER_NAME-mount"
  docker run -d --rm --name "$MOUNT_CONTAINER" -e ANTHROPIC_API_KEY="test" \
    -v "$TMPDIR:/workspace" "$IMAGE_NAME:$IMAGE_TAG" bash -c "sleep 30" &>/dev/null
  output=$(docker exec "$MOUNT_CONTAINER" cat /workspace/probe.txt 2>&1)
  docker rm -f "$MOUNT_CONTAINER" &>/dev/null
  rm -rf "$TMPDIR"
  if [ "$output" = "cli-mount-test" ]; then
    pass "Workspace mount passes data into container"
  else
    fail "Workspace mount (got: $output)"
  fi

  # Cleanup
  run_cli stop &>/dev/null
  docker rm -f "$CONTAINER_NAME" &>/dev/null
else
  echo ""
  echo "SKIP: Full lifecycle tests require the sandbox image ($IMAGE_NAME:$IMAGE_TAG)."
  echo "      Build it from the docker-hub repo: docker build -t $IMAGE_NAME:$IMAGE_TAG ."
fi

# ---- Summary ----
TOTAL=$((PASS + FAIL))
echo ""
echo "==========================================="
echo "  CLI E2E Results: $PASS/$TOTAL passed, $FAIL failed"
echo "==========================================="
echo ""

[ "$FAIL" -eq 0 ]
