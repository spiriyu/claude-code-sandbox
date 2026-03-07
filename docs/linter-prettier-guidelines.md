# Code Linter & Formatter Guidelines

Step-by-step guide to replicate the ESLint + Prettier setup used in this project. Designed for **Next.js 16+ / React 19 / TypeScript** codebases, but adaptable to any modern TS project.

---

## Table of Contents

1. [Overview](#overview)
2. [Dependencies](#dependencies)
3. [Prettier Configuration](#prettier-configuration)
4. [ESLint Configuration](#eslint-configuration)
5. [TypeScript Strict Mode](#typescript-strict-mode)
6. [Lint-Staged (Pre-commit)](#lint-staged-pre-commit)
7. [NPM Scripts](#npm-scripts)
8. [Editor Integration](#editor-integration)
9. [Rule-by-Rule Reference](#rule-by-rule-reference)

---

## Overview

The toolchain consists of three layers:

| Tool           | Role                                                               | Config File         |
| -------------- | ------------------------------------------------------------------ | ------------------- |
| **Prettier**   | Code formatting (whitespace, quotes, semicolons)                   | `.prettierrc`       |
| **ESLint**     | Code quality + correctness (unused vars, type safety, React rules) | `eslint.config.mjs` |
| **TypeScript** | Type checking (`--noEmit`)                                         | `tsconfig.json`     |

**Key principle:** Prettier handles _formatting_, ESLint handles _logic_. They never conflict because `eslint-config-prettier` disables all ESLint formatting rules.

---

## Dependencies

### Install

```bash
npm install -D \
  eslint \
  eslint-config-next \
  eslint-config-prettier \
  eslint-plugin-prettier \
  typescript-eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  prettier \
  lint-staged \
  typescript
```

### What each package does

| Package                            | Purpose                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `eslint`                           | Core linter engine (v9+ flat config)                                            |
| `eslint-config-next`               | Next.js preset — bundles react, react-hooks, jsx-a11y, import, and next plugins |
| `typescript-eslint`                | Monorepo entry point for TS parser + rules                                      |
| `@typescript-eslint/eslint-plugin` | TypeScript-specific lint rules                                                  |
| `@typescript-eslint/parser`        | Parses TS/TSX for ESLint                                                        |
| `eslint-plugin-prettier`           | Runs Prettier as an ESLint rule (shows formatting diffs as lint errors)         |
| `eslint-config-prettier`           | Disables ESLint rules that would conflict with Prettier                         |
| `prettier`                         | Opinionated code formatter                                                      |
| `lint-staged`                      | Runs linters on staged files only (pre-commit)                                  |

---

## Prettier Configuration

### `.prettierrc`

```json
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 180,
    "tabWidth": 4,
    "useTabs": false,
    "arrowParens": "always",
    "endOfLine": "lf",
    "bracketSpacing": true,
    "bracketSameLine": false
}
```

### Rule explanations

| Option            | Value      | Why                                                                           |
| ----------------- | ---------- | ----------------------------------------------------------------------------- |
| `semi`            | `true`     | Always use semicolons — prevents ASI edge cases                               |
| `trailingComma`   | `"es5"`    | Trailing commas in objects/arrays (cleaner diffs), but not in function params |
| `singleQuote`     | `true`     | Single quotes for JS/TS strings (double quotes still used in JSX)             |
| `printWidth`      | `180`      | Wide line limit — reduces unnecessary line wrapping on modern displays        |
| `tabWidth`        | `4`        | 4-space indentation for readability                                           |
| `useTabs`         | `false`    | Spaces, not tabs                                                              |
| `arrowParens`     | `"always"` | Always wrap arrow function params: `(x) => x` not `x => x`                    |
| `endOfLine`       | `"lf"`     | Unix line endings — prevents cross-OS diff noise                              |
| `bracketSpacing`  | `true`     | Spaces inside object braces: `{ foo }` not `{foo}`                            |
| `bracketSameLine` | `false`    | JSX closing `>` on a new line when multi-line                                 |

### `.prettierignore`

```gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Build outputs
.next
out
build
dist

# Testing
coverage
playwright-report
test-results

# Misc
.DS_Store
*.pem
.env*
!.env.example

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml
```

---

## ESLint Configuration

This project uses **ESLint v9 flat config** (`eslint.config.mjs`).

### `eslint.config.mjs`

```javascript
import nextConfig from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    // 1. Next.js core-web-vitals (includes react, react-hooks, jsx-a11y, import, next plugins)
    ...nextConfig,

    // 2. TypeScript recommended + type-checked rules
    ...tseslint.configs.recommendedTypeChecked,

    // 3. Prettier plugin — runs Prettier as ESLint rules
    prettierPlugin,

    // 4. Prettier config — MUST be last to disable conflicting rules
    prettierConfig,

    // 5. Global language options — enables type-aware linting
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },

    // 6. Main rules for all TS/TSX files
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            // TypeScript specific
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],

            // React specific
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-hooks/exhaustive-deps': 'warn',

            // General code quality
            'no-console': ['warn', { allow: ['log', 'info', 'warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    // 7. Test file overrides — relax type-checking for tests
    {
        files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },

    // 8. E2E Playwright tests — disable React-specific rules
    {
        files: ['e2e/**/*.spec.ts'],
        rules: {
            'react-hooks/rules-of-hooks': 'off',
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/set-state-in-effect': 'off',
            '@typescript-eslint/await-thenable': 'off',
        },
    },

    // 9. Global ignores
    {
        ignores: ['node_modules/', '.next/', 'out/', 'build/', 'dist/', 'coverage/', 'playwright-report/', 'test-results/', '*.config.js', '*.config.mjs', '.lintstagedrc.js'],
    }
);
```

### Config layer order (matters!)

```
1. eslint-config-next/core-web-vitals   → Base Next.js + React rules
2. tseslint.configs.recommendedTypeChecked → Type-aware TS rules
3. eslint-plugin-prettier/recommended    → Runs Prettier as ESLint rule
4. eslint-config-prettier               → Disables conflicting format rules (MUST be last)
```

---

## TypeScript Strict Mode

The `tsconfig.json` enables maximum strictness. This works alongside ESLint — TypeScript catches type errors, ESLint catches code quality issues.

### Key strict flags

```jsonc
{
    "compilerOptions": {
        "strict": true, // Enables all strict checks
        "noUnusedLocals": true, // Error on unused variables
        "noUnusedParameters": true, // Error on unused function params
        "noFallthroughCasesInSwitch": true, // Require break/return in switch
        "noUncheckedIndexedAccess": true, // arr[0] is T | undefined, not T
        "noImplicitReturns": true, // All code paths must return
        "forceConsistentCasingInFileNames": true, // Prevent import casing mismatches
        "allowUnreachableCode": false, // Error on dead code
        "allowUnusedLabels": false, // Error on unused labels
        "exactOptionalPropertyTypes": true, // Distinguishes undefined from missing
    },
}
```

---

## Lint-Staged (Pre-commit)

### `.lintstagedrc.js`

```javascript
module.exports = {
    // Type-check on TS file changes
    '**/*.ts?(x)': () => 'npm run type-check',

    // ESLint + Prettier on JS/TS files
    '**/*.(ts|tsx|js|jsx)': (filenames) => [`eslint --fix ${filenames.join(' ')}`, `prettier --write ${filenames.join(' ')}`],

    // Prettier only on non-code files
    '**/*.(json|md|css|scss)': (filenames) => `prettier --write ${filenames.join(' ')}`,
};
```

### What happens on commit

1. **TypeScript files** → Full project type-check (`tsc --noEmit`)
2. **JS/TS files** → ESLint auto-fix, then Prettier format
3. **JSON/MD/CSS** → Prettier format only

To enable, add a Git hook tool like [Husky](https://typicode.github.io/husky/):

```bash
npm install -D husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---

## NPM Scripts

Add these to your `package.json`:

```json
{
    "scripts": {
        "lint": "eslint .",
        "lint:fix": "eslint . --fix",
        "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md,css,scss}\"",
        "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,md,css,scss}\"",
        "type-check": "tsc --noEmit"
    }
}
```

| Command                | Use case                             |
| ---------------------- | ------------------------------------ |
| `npm run lint`         | CI — fail on lint errors             |
| `npm run lint:fix`     | Dev — auto-fix what ESLint can       |
| `npm run format`       | Dev — format all files               |
| `npm run format:check` | CI — fail if unformatted files exist |
| `npm run type-check`   | CI + Dev — verify types compile      |

### Recommended CI pipeline

```bash
npm run format:check && npm run lint && npm run type-check && npm run test
```

---

## Editor Integration

### VS Code (recommended)

Install extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

`.vscode/settings.json`:

```json
{
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
    },
    "eslint.useFlatConfig": true,
    "typescript.tsdk": "node_modules/typescript/lib"
}
```

This ensures:

- **On save** → Prettier formats the file
- **On save** → ESLint auto-fixes what it can
- **ESLint** uses the flat config format

### JetBrains (WebStorm / IntelliJ)

1. **Settings > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint** → Enable, select "Automatic ESLint configuration"
2. **Settings > Languages & Frameworks > JavaScript > Prettier** → Enable, set "Run on save"

---

## Rule-by-Rule Reference

### TypeScript Rules

| Rule                                                | Level   | Rationale                                                                                                       |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars`                 | `error` | Dead code removal. Prefix with `_` to ignore intentionally unused params/vars                                   |
| `@typescript-eslint/no-explicit-any`                | `warn`  | Discourages `any` — use `unknown` and narrow instead                                                            |
| `@typescript-eslint/explicit-module-boundary-types` | `off`   | TypeScript infers return types well enough — explicit types add noise                                           |
| `@typescript-eslint/require-await`                  | `off`   | Allows `async` functions without `await` (common in Next.js Server Actions)                                     |
| `@typescript-eslint/no-non-null-assertion`          | `warn`  | Discourages `value!` — prefer explicit null checks                                                              |
| `@typescript-eslint/consistent-type-imports`        | `error` | Enforces `import type { Foo }` or `import { type Foo }` for type-only imports. Uses `inline-type-imports` style |

### React Rules

| Rule                          | Level  | Rationale                                                                   |
| ----------------------------- | ------ | --------------------------------------------------------------------------- |
| `react/react-in-jsx-scope`    | `off`  | Not needed with React 17+ JSX transform                                     |
| `react/prop-types`            | `off`  | Using TypeScript for prop validation instead                                |
| `react-hooks/exhaustive-deps` | `warn` | Catches missing hook dependencies — warns instead of errors for flexibility |

### General Rules

| Rule           | Level   | Rationale                                                                                                 |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `no-console`   | `warn`  | Warns on console usage, but allows `log`, `info`, `warn`, `error` (use a structured logger in production) |
| `prefer-const` | `error` | Use `const` when variable is never reassigned                                                             |
| `no-var`       | `error` | Use `let`/`const` — `var` has scoping issues                                                              |

### Test File Relaxations

| Rule                                         | Disabled for     | Rationale                                                         |
| -------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| `@typescript-eslint/no-unsafe-assignment`    | Unit + E2E tests | Mocks and test fixtures often use loose typing                    |
| `@typescript-eslint/no-unsafe-member-access` | Unit + E2E tests | Same reason — test code prioritizes readability over strict types |
| `react-hooks/rules-of-hooks`                 | E2E only         | Playwright tests don't use React hooks                            |
| `react-hooks/exhaustive-deps`                | E2E only         | Not applicable to Playwright tests                                |
| `@typescript-eslint/await-thenable`          | E2E only         | Playwright's API sometimes needs `await` on sync-looking calls    |

---

## Adapting for Non-Next.js Projects

If your project doesn't use Next.js, replace the first config layer:

```javascript
// Instead of:
import nextConfig from 'eslint-config-next/core-web-vitals';

// Use individual plugins:
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
```

For non-React TypeScript projects, remove all React-related configs and keep only:

```javascript
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    ...tseslint.configs.recommendedTypeChecked,
    prettierPlugin,
    prettierConfig,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    }
    // ... your rules
);
```
