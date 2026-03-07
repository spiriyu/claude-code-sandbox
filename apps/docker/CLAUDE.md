# Claude Code Instructions — apps/docker

## Purpose

This app contains the Dockerfile for the `claude-code-sandbox` Docker image, published to Docker Hub as `spiriyu/claude-code-sandbox`.

## Conventions

- The Dockerfile must always result in a non-root `dev` user owning `/workspace`
- All tool installations go under `/home/dev` (nvm, pyenv, global npm packages)
- Build args: `USER_UID`, `USER_GID`, `NODE_VERSION`, `PYTHON_VERSION`
- Never hardcode credentials in the Dockerfile or any committed file
- Keep image lean: only install packages actually needed at runtime

## Version Matrix

Runtime versions are defined in `libs/shared/src/versions.json` (monorepo single source of truth).
The `scripts/generate-matrix.js` script reads from that file to produce the GitHub Actions matrix.

To add a new Node or Python version:

1. Edit `libs/shared/src/versions.json`
2. Verify: `RELEASE_VERSION=test node scripts/generate-matrix.js | jq .`

## Testing a Build

```bash
# From apps/docker/
docker build -f image/Dockerfile --build-arg USER_UID=$(id -u) --build-arg USER_GID=$(id -g) -t claude-code-sandbox .
docker run -it --rm -e ANTHROPIC_API_KEY=test -v $(pwd):/workspace claude-code-sandbox bash
```

Or via NX from workspace root:

```bash
nx run docker:build
```

## Releasing

Releases are triggered by pushing a `v*` tag (via `npm run release` at workspace root).
The GitHub Actions workflow `.github/workflows/docker-publish.yml` handles the Docker Hub publish.
