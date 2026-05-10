# Changelog

All notable changes to the Docker image are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.7.0] - 2026-05-10

### Added

- **Sandbox config hooks in entrypoint**: `entrypoint.sh` now runs
  `$SANDBOX_INIT_SCRIPT` exactly once on first container startup (tracked via
  `.init-done` marker inside `/home/dev/.claude/.claude-code-sandbox/`) and
  `$SANDBOX_LOOP_SCRIPT` at the top of every main-loop iteration. Both are opt-in
  via env vars set by the CLI and backward-compatible (no-op when unset).

---

## [0.5.1] - 2026-03-09

Maintenance release — version aligned with CLI v0.5.1.

---

## [0.5.0] - 2026-03-09

Project restructured and transferred to new repository.

---

## [0.4.0] - 2026-03-09

### Added

- Docker Hub README auto-generated from `versions.json` and pushed to Docker Hub on every release

---

## [0.3.0] - 2026-03-08

### Added

- Entrypoint loops: Claude session auto-restarts after exit, keeping the container alive for the next session
- Node.js and Python version matrix (multiple runtime combinations built and published per release)

---

## [0.2.0] - 2026-03-08

Initial public release.

---

[0.5.1]: https://github.com/spiriyu/claude-code-sandbox/compare/docker-v0.5.0...docker-v0.5.1
[0.5.0]: https://github.com/spiriyu/claude-code-sandbox/compare/docker-v0.4.0...docker-v0.5.0
[0.4.0]: https://github.com/spiriyu/claude-code-sandbox/compare/docker-v0.3.0...docker-v0.4.0
[0.3.0]: https://github.com/spiriyu/claude-code-sandbox/compare/docker-v0.2.0...docker-v0.3.0
[0.2.0]: https://github.com/spiriyu/claude-code-sandbox/releases/tag/docker-v0.2.0
