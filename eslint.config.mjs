// @ts-check
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
    // 1. Global ignores
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**', '**/archive/**'],
    },

    // 2. TypeScript source files — full type-checked rules
    {
        files: ['apps/cli/src/**/*.ts', 'libs/shared/src/**/*.ts'],
        extends: [...tseslint.configs.recommendedTypeChecked, prettierPlugin],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
            'no-console': ['warn', { allow: ['log', 'info', 'warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    // 3. Test files — relax unsafe rules
    {
        files: ['**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },

    // 4. Config TS files (not in any tsconfig include) — disable type-checked rules
    {
        files: ['apps/cli/tsup.config.ts', 'apps/cli/vitest.config.ts'],
        extends: [tseslint.configs.disableTypeChecked, prettierPlugin],
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    // 5. Plain CJS JS scripts — disable type-checked rules
    {
        files: ['apps/docker/scripts/**/*.js'],
        extends: [tseslint.configs.disableTypeChecked, prettierPlugin],
        rules: {
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
);
