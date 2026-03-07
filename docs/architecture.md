# Architecture

## Monorepo Structure

```
claude-code-sandbox/
├── apps/
│   ├── cli/                    # @claude-code-sandbox/cli  — npm CLI package
│   └── docker/                 # @spiriyu/claude-code-sandbox-docker — Docker image + CI scripts
├── libs/
│   └── shared/                 # @spiriyu/claude-code-sandbox-shared — shared library (private)
├── .github/
│   └── workflows/
│       └── docker-publish.yml  # CI/CD: builds & pushes Docker image on release
├── archive/                    # Historical planning docs (read-only, not active)
├── docs/                       # Developer documentation (you are here)
├── nx.json                     # NX task orchestration config
├── package.json                # Root: workspaces + NX devDep
├── tsconfig.base.json          # Shared TypeScript compiler options
├── .release-it.json            # Release automation (git tag → GitHub release)
└── .gitignore
```

## Package Map

| Package       | Name                     | Type            | Tooling                  |
| ------------- | ------------------------ | --------------- | ------------------------ |
| `apps/cli`    | `@claude-code-sandbox/cli`            | npm CLI         | TypeScript, tsup, vitest |
| `apps/docker` | `@spiriyu/claude-code-sandbox-docker` | Docker image    | Bash, Dockerfile         |
| `libs/shared` | `@spiriyu/claude-code-sandbox-shared` | Private library | TypeScript               |

## Dependency Graph

```
@claude-code-sandbox/cli
    └── @spiriyu/claude-code-sandbox-shared   (runtime: versions, DEFAULT_*)

@spiriyu/claude-code-sandbox-docker
    └── @spiriyu/claude-code-sandbox-shared   (build-time: reads versions.json for CI matrix)
```

`@spiriyu/claude-code-sandbox-shared` has no runtime dependencies — it only exports JSON data and pure TypeScript functions.

## NX Setup (Lightweight)

NX is used as a **task orchestrator only** — no NX plugins, generators, or executors replace the existing tooling (tsup, vitest, Docker). Each app keeps its own build configuration.

What NX adds:

- **Task graph** — `build` depends on `^build` (build shared before cli)
- **Caching** — repeated builds/tests use cache from `.nx/cache/`
- **`run-many`** — `nx run-many -t build` builds all projects in dependency order

Configuration files:

- `nx.json` — global task defaults and cache inputs
- `apps/cli/project.json` — defines `build`, `test`, `lint`, `dev` targets
- `apps/docker/project.json` — defines `build` (docker build) and `generate-matrix` targets
- `libs/shared/project.json` — no build targets (source-only library)

## npm Workspaces

The root `package.json` declares `"workspaces": ["apps/*", "libs/*"]`. Running `npm install` at the root:

1. Installs all workspace package dependencies into the root `node_modules/`
2. Creates symlinks: `node_modules/@spiriyu/claude-code-sandbox-shared` → `libs/shared`

This lets `apps/cli` import `@spiriyu/claude-code-sandbox-shared` as if it were a published npm package, while resolving to the local TypeScript source.

## TypeScript Path Resolution

The CLI imports from `@spiriyu/claude-code-sandbox-shared` via three aligned configurations:

| Tool                     | Config                                             | Alias                                                       |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| Type-checker (`tsc`)     | `apps/cli/tsconfig.json` → `paths`                 | `@spiriyu/claude-code-sandbox-shared` → `../../libs/shared/src/index.ts`  |
| Bundler (`tsup`/esbuild) | `apps/cli/tsup.config.ts` → `esbuildOptions.alias` | same path                                                   |
| Test runner (`vitest`)   | `apps/cli/vitest.config.ts` → `resolve.alias`      | same path                                                   |

`rootDir` is intentionally absent from `apps/cli/tsconfig.json` — having it would prevent `tsc --noEmit` from resolving cross-package paths. tsup manages the output directory (`dist/`) independently via its own `outDir` option.

## Design Decisions

### No Docker SDK in CLI

The CLI calls `docker` via Node's `spawnSync` rather than using `dockerode` or similar. Rationale:

- Zero extra dependencies
- Works with any Docker installation (Desktop, Colima, Rancher, remote socket)
- No API version mismatch risks

### Single Source of Truth for Versions

`libs/shared/src/versions.json` is the only place where supported Node.js and Python versions are declared. Both the CLI's default values (`DEFAULT_NODE_VERSION`, `DEFAULT_PYTHON_VERSION`) and the Docker Hub CI matrix are derived from this file. Updating a version in one place keeps everything in sync automatically.

### Credentials Never Stored in Config

The `conf` store (`~/.claude-code-sandbox/config.json`) deliberately never holds auth tokens. Credentials live only in environment variables or `~/.claude-code-sandbox/.env` (chmod 600). This prevents accidental exposure via `claude-code-sandbox config list`.

### Debian over Alpine

The Docker image uses `debian:bookworm-slim` instead of Alpine because:

- pyenv-built Python requires glibc (musl libc on Alpine causes build failures)
- Many native npm packages also assume glibc
- The size penalty is acceptable given the full dev toolchain needed
