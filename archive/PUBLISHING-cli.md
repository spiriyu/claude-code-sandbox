# Publishing to npm

## Prerequisites

1. npm account with access to the `@claude-code-sandbox` scope
   - Create at [npmjs.com](https://www.npmjs.com)
   - Create the org: `npm org create claude-code-sandbox` (or via npm website)
2. npm automation token — npmjs.com → Account → Access Tokens → Generate New Token → Automation
3. Logged in locally: `npm login`

## Manual Publish

```bash
# Bump version (choose one)
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

# Build
npm run build

# Publish (--access public required for scoped packages)
npm publish --access public
```

## Pre-publish Checklist

- [ ] `npm run build` passes cleanly
- [ ] `npm run lint` (tsc --noEmit) passes
- [ ] `npm run test` passes
- [ ] Version bumped in `package.json`
- [ ] `README.md` is up to date
- [ ] `dist/` is excluded from git but included in the npm package

## Verify the Package

```bash
# Check what will be published before publishing
npm pack --dry-run

# Test install locally
npm install -g .
claude-code-sandbox --version
claude-code-sandbox --help
```

## Recommended GitHub Actions Workflow (future)

Trigger: push a tag matching `v*` on `main`.

```yaml
# .github/workflows/npm-publish.yml
name: Publish to npm

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Required GitHub Secrets
| Secret | Value |
|--------|-------|
| `NPM_TOKEN` | npm automation token |
