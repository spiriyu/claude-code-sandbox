# Phase 1 — Project Infrastructure

## Goal
Set up both repositories with proper project structure, dependencies, and tooling.

## Scope

### claude-code-sandbox-docker-hub
- Add `README.md` with usage instructions and badge placeholders
- Add `Dockerfile` (placeholder — built in Phase 2)
- Add `.dockerignore`
- Add `CLAUDE.md` for repo conventions

### claude-code-sandbox-docker-cli (@claude-code-sandbox/cli)
- Initialize with `npm init` — scoped package `@claude-code-sandbox/cli`
- TypeScript setup (`tsconfig.json`, `src/` directory)
- Dev dependencies: `typescript`, `@types/node`, `tsup` (bundler)
- Runtime dependencies: `commander` (CLI framework), `chalk` (colors), `ora` (spinners), `inquirer` (interactive prompts), `conf` (persistent config)
- Add `bin` entry in `package.json` pointing to `dist/cli.js`
- Add `"claude-code-sandbox"` as the CLI bin name
- Add `.dockerignore`, `.npmignore`
- Add `CLAUDE.md` for repo conventions
- Add build/dev scripts in `package.json`

## Directory Structure

```
claude-code-sandbox-docker-hub/
├── Dockerfile
├── .dockerignore
├── scripts/
│   └── entrypoint.sh
├── config/
│   └── .claude.json
├── LICENSE
└── README.md

claude-code-sandbox-docker-cli/
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/
│   │   ├── start.ts
│   │   ├── stop.ts
│   │   ├── status.ts
│   │   ├── shell.ts
│   │   ├── auth.ts
│   │   └── config.ts
│   ├── lib/
│   │   ├── docker.ts       # Docker interaction helpers
│   │   ├── config.ts        # Persistent config (Conf)
│   │   └── constants.ts     # Image name, defaults
│   └── utils/
│       └── logger.ts        # Chalk-based logger
├── tsconfig.json
├── tsup.config.ts
├── package.json
├── .gitignore
├── .npmignore
├── LICENSE
└── README.md
```

## Acceptance Criteria
- [ ] `npm run build` succeeds in CLI repo
- [ ] `claude-code-sandbox --help` prints usage after `npm link`
- [ ] Docker-hub repo has clean Dockerfile placeholder
