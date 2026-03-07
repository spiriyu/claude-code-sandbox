import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskToken, validateToken, getStoredAuth } from './auth.js';
import { AUTH_METHODS } from '../lib/constants.js';
import { existsSync, readFileSync } from 'fs';
import type * as fsModule from 'fs';

// Prevent conf from writing to disk during tests
vi.mock('conf', () => {
    class MockConf {
        private _defaults: Record<string, unknown>;
        private _overrides: Record<string, unknown> = {};
        path = '/mock/.claude-code-sandbox/src.json';
        constructor(opts: { defaults?: Record<string, unknown>; projectName?: string } = {}) {
            this._defaults = { ...(opts.defaults ?? {}) };
        }
        get store() {
            return { ...this._defaults, ...this._overrides };
        }
        get(key: string) {
            return key in this._overrides ? this._overrides[key] : this._defaults[key];
        }
        set(key: string, value: unknown) {
            this._overrides[key] = value;
        }
        clear() {
            this._overrides = {};
        }
    }
    return { default: MockConf };
});

// Prevent fs reads/writes to real files
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof fsModule>();
    return {
        ...actual,
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(() => ''),
    };
});

describe('maskToken', () => {
    it('masks short tokens completely', () => {
        expect(maskToken('short')).toBe('***');
        expect(maskToken('123456789012')).toBe('***');
    });

    it('shows first 10 and last 4 characters', () => {
        const token = 'sk-ant-api03-ABCDEFGHIJKLMNOP';
        const masked = maskToken(token);
        expect(masked.startsWith('sk-ant-api')).toBe(true);
        expect(masked.endsWith(token.slice(-4))).toBe(true);
        expect(masked).toContain('***');
    });

    it('does not expose the full token', () => {
        const token = 'sk-ant-api03-supersecretvalue1234';
        const masked = maskToken(token);
        expect(masked).not.toBe(token);
        expect(masked.length).toBeLessThan(token.length);
    });
});

describe('validateToken', () => {
    it('validates correct API key prefix', () => {
        expect(validateToken('sk-ant-api03-abc123', AUTH_METHODS.API_KEY)).toBe(true);
    });

    it('rejects wrong prefix for API key', () => {
        expect(validateToken('sk-ant-oat01-abc123', AUTH_METHODS.API_KEY)).toBe(false);
        expect(validateToken('not-a-key', AUTH_METHODS.API_KEY)).toBe(false);
    });

    it('validates correct OAuth token prefix', () => {
        expect(validateToken('sk-ant-oat01-abc123', AUTH_METHODS.OAUTH_TOKEN)).toBe(true);
    });

    it('rejects wrong prefix for OAuth token', () => {
        expect(validateToken('sk-ant-api03-abc123', AUTH_METHODS.OAUTH_TOKEN)).toBe(false);
        expect(validateToken('not-a-token', AUTH_METHODS.OAUTH_TOKEN)).toBe(false);
    });
});

describe('getStoredAuth', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    });

    afterEach(() => {
        process.env.ANTHROPIC_API_KEY = originalEnv.ANTHROPIC_API_KEY;
        process.env.CLAUDE_CODE_OAUTH_TOKEN = originalEnv.CLAUDE_CODE_OAUTH_TOKEN;
    });

    it('returns ANTHROPIC_API_KEY from env', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test';
        const result = getStoredAuth();
        expect(result).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-test' });
    });

    it('returns CLAUDE_CODE_OAUTH_TOKEN from env', () => {
        process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oat01-test';
        const result = getStoredAuth();
        expect(result).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-test' });
    });

    it('prefers ANTHROPIC_API_KEY when both are set', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-test';
        process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oat01-test';
        const result = getStoredAuth();
        expect(result).toHaveProperty('ANTHROPIC_API_KEY');
        expect(result).not.toHaveProperty('CLAUDE_CODE_OAUTH_TOKEN');
    });

    it('returns null when no credentials are set and no .env file', () => {
        const result = getStoredAuth();
        expect(result).toBeNull();
    });

    describe('.env file parsing', () => {
        beforeEach(() => {
            vi.mocked(existsSync).mockReturnValue(true);
        });

        afterEach(() => {
            vi.mocked(existsSync).mockReturnValue(false);
            vi.mocked(readFileSync).mockReturnValue('');
        });

        it('reads ANTHROPIC_API_KEY from .env file', () => {
            vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=sk-ant-api03-test\n');
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-test' });
        });

        it('reads CLAUDE_CODE_OAUTH_TOKEN from .env file', () => {
            vi.mocked(readFileSync).mockReturnValue('CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-test\n');
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-test' });
        });

        it('prefers ANTHROPIC_API_KEY when both keys appear in .env', () => {
            vi.mocked(readFileSync).mockReturnValue(
                'ANTHROPIC_API_KEY=sk-ant-api03-key\nCLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-tok\n',
            );
            const result = getStoredAuth('/some/.env');
            expect(result).toHaveProperty('ANTHROPIC_API_KEY');
            expect(result).not.toHaveProperty('CLAUDE_CODE_OAUTH_TOKEN');
        });

        it('handles values containing "=" characters', () => {
            vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=abc=def=ghi\n');
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ ANTHROPIC_API_KEY: 'abc=def=ghi' });
        });

        it('trims whitespace from keys and values', () => {
            vi.mocked(readFileSync).mockReturnValue('  ANTHROPIC_API_KEY  =  sk-ant-api03-trimmed  \n');
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-trimmed' });
        });

        it('skips empty lines', () => {
            vi.mocked(readFileSync).mockReturnValue('\n\nANTHROPIC_API_KEY=sk-ant-api03-test\n\n');
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-test' });
        });

        it('skips lines without "=" (e.g., comments)', () => {
            vi.mocked(readFileSync).mockReturnValue(
                '# this is a comment\nANTHROPIC_API_KEY=sk-ant-api03-test\n',
            );
            const result = getStoredAuth('/some/.env');
            expect(result).toEqual({ ANTHROPIC_API_KEY: 'sk-ant-api03-test' });
        });

        it('returns null when .env has no relevant keys', () => {
            vi.mocked(readFileSync).mockReturnValue('SOME_OTHER_KEY=value\n');
            const result = getStoredAuth('/some/.env');
            expect(result).toBeNull();
        });

        it('returns null when .env file is empty', () => {
            vi.mocked(readFileSync).mockReturnValue('');
            const result = getStoredAuth('/some/.env');
            expect(result).toBeNull();
        });
    });
});
