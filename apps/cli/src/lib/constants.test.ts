import { describe, it, expect } from 'vitest';
import {
    DEFAULT_IMAGE_TAG,
    DEFAULT_IMAGE,
    CONTAINER_NAME_PREFIX,
    DEFAULT_NODE_VERSION,
    DEFAULT_PYTHON_VERSION,
    AUTH_METHODS,
    TOKEN_PREFIXES,
} from './constants.js';

describe('constants', () => {
    it('has correct default image tag', () => {
        expect(DEFAULT_IMAGE_TAG).toBe('latest');
    });

    it('has correct default image', () => {
        expect(DEFAULT_IMAGE).toBe('spiriyu/claude-code-sandbox');
    });

    it('has correct container name prefix', () => {
        expect(CONTAINER_NAME_PREFIX).toBe('claude-code-sandbox-');
    });

    it('has correct default Node version', () => {
        expect(DEFAULT_NODE_VERSION).toBe('24');
    });

    it('has correct default Python version', () => {
        expect(DEFAULT_PYTHON_VERSION).toBe('3.13');
    });

    it('AUTH_METHODS contains api_key and oauth_token', () => {
        expect(AUTH_METHODS.API_KEY).toBe('api_key');
        expect(AUTH_METHODS.OAUTH_TOKEN).toBe('oauth_token');
    });

    it('TOKEN_PREFIXES match Anthropic token formats', () => {
        expect(TOKEN_PREFIXES.api_key).toBe('sk-ant-api03-');
        expect(TOKEN_PREFIXES.oauth_token).toBe('sk-ant-oat01-');
    });
});
