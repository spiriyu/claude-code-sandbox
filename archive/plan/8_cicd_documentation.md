# Phase 8 — CI/CD Documentation

## Goal
Document the steps for automated publishing of the Docker image to Docker Hub and the CLI to npm. (Workflows will not be created in this phase — only documentation.)

## Docker Hub Publishing

### Prerequisites
- Docker Hub account with repository `<user>/claude-code-sandbox`
- Docker Hub access token (Settings > Security > New Access Token)
- GitHub repo secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

### Manual Publish Steps
```bash
# From claude-code-sandbox-docker-hub repo root
docker build -t <user>/claude-code-sandbox:latest .
docker tag <user>/claude-code-sandbox:latest <user>/claude-code-sandbox:v1.0.0
docker push <user>/claude-code-sandbox:latest
docker push <user>/claude-code-sandbox:v1.0.0
```

### Recommended GitHub Actions Workflow (for future)
- Trigger: push tag `v*` on main branch
- Steps: checkout, setup buildx, login to Docker Hub, build + push (latest + version tag)
- Multi-platform: `linux/amd64`, `linux/arm64`

## npm Publishing

### Prerequisites
- npm account with access to `@claude-code-sandbox` scope
- npm access token (automation type)
- GitHub repo secret: `NPM_TOKEN`

### Manual Publish Steps
```bash
# From claude-code-sandbox-docker-cli repo root
npm run build
npm publish --access public
```

### Recommended GitHub Actions Workflow (for future)
- Trigger: push tag `v*` on main branch
- Steps: checkout, setup Node.js, install deps, build, test, publish to npm

## Versioning Strategy
- Both repos follow semver
- Docker image tags mirror repo version tags
- CLI `package.json` version is source of truth for npm
- Use `npm version patch|minor|major` to bump + tag

## Acceptance Criteria
- [ ] Publishing steps documented in both READMEs
- [ ] Manual publish works for Docker Hub
- [ ] Manual publish works for npm
- [ ] Document is clear enough for any team member to follow
