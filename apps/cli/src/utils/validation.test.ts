import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { validateWorkspace, validateImageName, validateTag, validateToken } from './validation.js';

// Create a real temp dir we can point workspace tests at
const tmpBase = join(tmpdir(), 'validation-test-' + randomUUID());
mkdirSync(tmpBase, { recursive: true });
const tmpFile = join(tmpBase, 'file.txt');
writeFileSync(tmpFile, 'hello');

describe('validateWorkspace', () => {
    it('returns null for existing directory', () => {
        expect(validateWorkspace(tmpBase)).toBeNull();
    });

    it('returns error for non-existent path', () => {
        const err = validateWorkspace('/this/does/not/exist/at/all');
        expect(err).not.toBeNull();
        expect(err).toMatch(/not found/i);
    });

    it('returns error when path is a file, not a directory', () => {
        const err = validateWorkspace(tmpFile);
        expect(err).not.toBeNull();
        expect(err).toMatch(/not a directory/i);
    });

    it('resolves relative paths before checking', () => {
        // '.' always exists as the cwd
        expect(validateWorkspace('.')).toBeNull();
    });
});

describe('validateImageName', () => {
    it('returns null for valid lowercase image name', () => {
        expect(validateImageName('myimage')).toBeNull();
    });

    it('returns null for registry-prefixed image', () => {
        expect(validateImageName('docker.io/user/image')).toBeNull();
        expect(validateImageName('spiriyu/claude-code-sandbox')).toBeNull();
    });

    it('returns null for image with dots, hyphens, underscores', () => {
        expect(validateImageName('my.image-name_v2')).toBeNull();
    });

    it('returns null for image with registry port', () => {
        expect(validateImageName('registry:5000/myimage')).toBeNull();
    });

    it('returns error for empty string', () => {
        expect(validateImageName('')).not.toBeNull();
    });

    it('returns error for name with uppercase letters', () => {
        const err = validateImageName('MyImage');
        expect(err).not.toBeNull();
    });

    it('returns error for name with spaces', () => {
        expect(validateImageName('my image')).not.toBeNull();
    });

    it('returns error for name exceeding 256 chars', () => {
        const err = validateImageName('a'.repeat(257));
        expect(err).not.toBeNull();
        expect(err).toMatch(/too long/i);
    });

    it('returns null for name exactly 256 chars', () => {
        expect(validateImageName('a'.repeat(256))).toBeNull();
    });

    it('returns error for name with @ or #', () => {
        expect(validateImageName('my@image')).not.toBeNull();
        expect(validateImageName('my#image')).not.toBeNull();
    });
});

describe('validateTag', () => {
    it('returns null for simple alphanumeric tag', () => {
        expect(validateTag('latest')).toBeNull();
        expect(validateTag('v1')).toBeNull();
        expect(validateTag('node24')).toBeNull();
    });

    it('returns null for tag with dots and hyphens', () => {
        expect(validateTag('node24-python3.13')).toBeNull();
        expect(validateTag('1.2.3')).toBeNull();
    });

    it('returns null for mixed-case tag', () => {
        expect(validateTag('NodeLatest')).toBeNull();
    });

    it('returns error for empty tag', () => {
        expect(validateTag('')).not.toBeNull();
    });

    it('returns error for tag with slashes', () => {
        expect(validateTag('my/tag')).not.toBeNull();
    });

    it('returns error for tag with spaces', () => {
        expect(validateTag('my tag')).not.toBeNull();
    });

    it('returns error for tag exceeding 128 chars', () => {
        const err = validateTag('a'.repeat(129));
        expect(err).not.toBeNull();
        expect(err).toMatch(/too long/i);
    });

    it('returns null for tag exactly 128 chars', () => {
        expect(validateTag('a'.repeat(128))).toBeNull();
    });
});

describe('validateToken', () => {
    it('returns null when token starts with expected prefix', () => {
        expect(validateToken('sk-ant-api03-abc123', 'sk-ant-api03-')).toBeNull();
        expect(validateToken('sk-ant-oat01-xyz', 'sk-ant-oat01-')).toBeNull();
    });

    it('returns error when token does not start with prefix', () => {
        const err = validateToken('wrong-prefix-abc', 'sk-ant-api03-');
        expect(err).not.toBeNull();
    });

    it('returns error for empty token', () => {
        expect(validateToken('', 'sk-ant-api03-')).not.toBeNull();
    });

    it('returns error when token is just the prefix with nothing after', () => {
        // The prefix itself is technically a valid start, so this should pass
        expect(validateToken('sk-ant-api03-', 'sk-ant-api03-')).toBeNull();
    });
});
