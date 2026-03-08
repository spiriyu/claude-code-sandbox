import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
    },
    resolve: {
        alias: {
            '@claude-code-sandbox/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
        },
    },
});
