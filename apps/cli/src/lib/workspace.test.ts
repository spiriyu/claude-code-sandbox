import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { resolveWorkspace } from './workspace.js';
import { ENV_VARS } from './constants.js';

describe('resolveWorkspace', () => {
    const origEnv = process.env[ENV_VARS.WORKSPACE];

    beforeEach(() => {
        delete process.env[ENV_VARS.WORKSPACE];
    });

    afterEach(() => {
        if (origEnv !== undefined) {
            process.env[ENV_VARS.WORKSPACE] = origEnv;
        } else {
            delete process.env[ENV_VARS.WORKSPACE];
        }
    });

    it('returns cwd as absolute path when no flag or env var', () => {
        const result = resolveWorkspace();
        expect(result).toBe(resolve(process.cwd()));
    });

    it('flag takes precedence over env var', () => {
        process.env[ENV_VARS.WORKSPACE] = '/env/path';
        expect(resolveWorkspace('/flag/path')).toBe('/flag/path');
    });

    it('env var is used when no flag is provided', () => {
        process.env[ENV_VARS.WORKSPACE] = '/env/workspace';
        expect(resolveWorkspace()).toBe('/env/workspace');
    });

    it('resolves a relative flag path to an absolute path', () => {
        const result = resolveWorkspace('relative/subdir');
        expect(result).toBe(resolve('relative/subdir'));
        expect(result.startsWith('/')).toBe(true);
    });

    it('returns an absolute flag path unchanged', () => {
        expect(resolveWorkspace('/absolute/path')).toBe('/absolute/path');
    });

    it('resolves "." to cwd', () => {
        expect(resolveWorkspace('.')).toBe(resolve('.'));
    });

    it('env var with relative path is resolved to absolute', () => {
        process.env[ENV_VARS.WORKSPACE] = 'relative/env/path';
        const result = resolveWorkspace();
        expect(result).toBe(resolve('relative/env/path'));
        expect(result.startsWith('/')).toBe(true);
    });
});
