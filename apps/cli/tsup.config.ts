import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
    entry: ['src/cli.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    noExternal: ['@claude-code-sandbox/shared'],
    banner: {
        js: `#!/usr/bin/env node
import { createRequire as __cjs_createRequire } from 'module';
const require = __cjs_createRequire(import.meta.url);`,
    },
    esbuildOptions(options) {
        options.alias = {
            '@claude-code-sandbox/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
        };
    },
});
