# Phase 7 — Testing & Polish

## Goal
Add tests, improve error handling, write documentation, and ensure end-to-end flow works.

## Testing

### Unit Tests (vitest)
- Config store: read/write/reset/defaults
- Docker helpers: command construction, output parsing
- Auth validation: token format checks
- Logger: output formatting

### Integration Tests
- CLI command parsing (--help, --version, unknown commands)
- Config persistence across CLI invocations
- Docker command generation (verify correct `docker run` args)

### Manual E2E Checklist
- [ ] Fresh install: `npx @claude-code-sandbox/cli start`
- [ ] Auth wizard: `claude-code-sandbox auth`
- [ ] Config flow: `claude-code-sandbox config set/get/list`
- [ ] Container lifecycle: start -> status -> shell -> stop
- [ ] Workspace mount works correctly
- [ ] Both auth methods work

## Polish
- Helpful error messages when Docker is not installed
- Helpful error messages when Docker daemon is not running
- Graceful handling of Ctrl+C during operations
- `--help` text for every command with examples
- ASCII art banner on first run (subtle, not obnoxious)

## Documentation
- README.md for both repos
- Quick-start guide in CLI README
- Troubleshooting section

## Acceptance Criteria
- [ ] `npm test` passes all unit tests
- [ ] E2E checklist passes manually
- [ ] READMEs are complete and accurate
