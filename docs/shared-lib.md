# Shared Library — @claude-code-sandbox/shared

Source: `libs/shared/`
Package name: `@claude-code-sandbox/shared` (private — not published to npm)

## Purpose

The shared library is the **single source of truth** for runtime version definitions. It prevents version drift between the Docker image and the CLI by ensuring both derive their defaults from the same data.

## Files

```
libs/shared/
├── src/
│   ├── versions.json   # Canonical Node.js and Python version list
│   └── index.ts        # TypeScript exports
├── package.json
├── tsconfig.json
└── project.json
```

## versions.json

```json
{
    "node": ["22.18.0", "20.19.4"],
    "python": ["3.13", "3.12", "3.11"]
}
```

**Rules:**

- Lists are ordered highest-first — the first entry is the default for both CLI and Docker
- Node versions use the **full semver** (`22.18.0`) — the CI matrix and Docker `NODE_VERSION` build arg receive this
- Python versions use **major.minor** (`3.13`) — pyenv accepts this format
- All listed versions are published to Docker Hub as separate image tags

## Exports

```typescript
import {
    versions, // { node: string[], python: string[] }
    DEFAULT_NODE_VERSION, // "22"  (major of versions.node[0])
    DEFAULT_PYTHON_VERSION, // "3.13" (versions.python[0])
    generateMatrix, // (releaseVersion: string) => { include: MatrixEntry[] }
    MatrixEntry, // interface { node_version, python_version, tags }
} from '@claude-code-sandbox/shared';
```

### `versions`

The raw parsed `versions.json` object. Use this when you need the full list.

### `DEFAULT_NODE_VERSION`

The major version number extracted from `versions.node[0]`. Example: `"22.18.0"` → `"22"`. Used by the CLI as the default Node version shown in help text and stored in config defaults.

### `DEFAULT_PYTHON_VERSION`

Equal to `versions.python[0]` unchanged. Example: `"3.13"`. Used by the CLI for the same purpose.

### `generateMatrix(releaseVersion)`

Pure TypeScript port of `apps/docker/scripts/generate-matrix.js`. Produces the full cartesian product of node×python combinations with computed alias tags. Primarily useful for testing tag generation without running the script.

```typescript
const { include } = generateMatrix('1.0.0');
// include[0] = { node_version: '22.18.0', python_version: '3.13', tags: '1.0.0_node22.18.0_python3.13,...,latest,1.0.0' }
// include.length === 6  (2 node × 3 python)
```

## Tag Alias Rules

For a release `1.0.0` with `node: ["22.18.0", "20.19.4"]` and `python: ["3.13", "3.12", "3.11"]`:

Each version always gets its **full string** as a tag alias. Among versions sharing the same major, only the **highest** gets the major-only alias. Same rule applies to major.minor.

| Node version           | Python version | Tags (prefixed with release version)                                                                                                                                                               |
| ---------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22.18.0 (highest)      | 3.13 (highest) | `1.0.0_node22.18.0_python3.13`, `1.0.0_node22_python3.13`, `1.0.0_node22.18_python3.13`, `1.0.0_node22_python3`, `1.0.0_node22.18_python3`, `1.0.0_node22.18.0_python3`, **`latest`**, **`1.0.0`** |
| 22.18.0                | 3.12           | `1.0.0_node22.18.0_python3.12`, `1.0.0_node22_python3.12`, `1.0.0_node22.18_python3.12`                                                                                                            |
| 20.19.4 (highest 20.x) | 3.13           | `1.0.0_node20.19.4_python3.13`, `1.0.0_node20_python3.13`, `1.0.0_node20.19_python3.13`, `1.0.0_node20_python3`, `1.0.0_node20.19_python3`, `1.0.0_node20.19.4_python3`                            |
| ...                    | ...            | ...                                                                                                                                                                                                |

`latest` and the bare version tag (`1.0.0`) are only applied to the highest node + highest python combination.

## How to Update Versions

### Add a new Node.js version

```json
{
    "node": ["24.0.0", "22.18.0", "20.19.4"],
    "python": ["3.13", "3.12", "3.11"]
}
```

Adding `24.0.0` at the front makes it the new default. `24` becomes the new `latest` default.

### Retire an old version

Remove it from the array. It will no longer be built or tagged. The highest remaining version automatically becomes the default.

### Verify the matrix

```bash
RELEASE_VERSION=test node apps/docker/scripts/generate-matrix.js | jq .
```

Expected: `include` array with `length === (node.length × python.length)`.

### Check CLI defaults still reflect the change

```bash
cd apps/cli
node -e "import('./src/lib/constants.js').then(m => { console.log('Node:', m.DEFAULT_NODE_VERSION); console.log('Python:', m.DEFAULT_PYTHON_VERSION) })"
```

Or after build: `node dist/cli.mjs config list`

## How Consumers Use the Library

### CLI app (`apps/cli`)

Resolves via tsconfig `paths` + tsup `esbuildOptions.alias` + vitest `resolve.alias`. The shared library code is **inlined** into the CLI bundle at build time — the published npm package has no runtime dependency on the monorepo.

### Docker scripts (`apps/docker/scripts/generate-matrix.js`)

Reads `versions.json` directly via `fs.readFileSync` with a relative path. No TypeScript compilation needed.

```javascript
const versions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'libs', 'shared', 'src', 'versions.json'), 'utf8'));
```
