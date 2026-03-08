# Claude Code Instructions — apps/cli

## Purpose

This is the npm CLI package `@claude-code-sandbox/cli`. It manages the `claude-code-sandbox` Docker container.

## Tech Stack

- TypeScript + tsup (ESM output)
- commander (CLI framework)
- chalk + ora (styling)
- inquirer (interactive prompts)
- conf (persistent config at ~/.claude-code-sandbox/config.json)
- `@claude-code-sandbox/shared` (shared versions + helpers from `libs/shared`)

## Commands

- `build`: `tsup` — compiles src/ → dist/
- `test`: `vitest run`
- `lint`: `eslint src`
- `type-check`: `tsc --noEmit`

## Dev Notes

- All imports use `.js` extensions (ESM resolution)
- Never store credentials in config store — only in env vars or `~/.claude-code-sandbox/.env`
- Docker is accessed via `dockerode` (typed Docker API client, no shelling out)
- `conf` default for `workspacePath` is set at startup (process.cwd()), not a static value
- `DEFAULT_NODE_VERSION` and `DEFAULT_PYTHON_VERSION` are imported from `@claude-code-sandbox/shared`
  and always reflect the highest versions in `libs/shared/src/versions.json`

## Path Alias

`@claude-code-sandbox/shared` resolves to `../../libs/shared/src/index.ts` via:

- tsconfig.json `paths` (for type-checking)
- tsup.config.ts `esbuildOptions.alias` (for bundling)
- vitest.config.ts `resolve.alias` (for tests)
