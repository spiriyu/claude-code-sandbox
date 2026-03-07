import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
    entry: ['src/cli.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    noExternal: ['@spiriyu/claude-code-sandbox-shared'],
    banner: {
        js: '#!/usr/bin/env node',
    },
    esbuildOptions(options) {
        options.alias = {
            '@spiriyu/claude-code-sandbox-shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
        };
    },
});
