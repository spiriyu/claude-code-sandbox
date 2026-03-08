import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { loadConfig, saveConfig } from './config-store.js';

// Use a unique temp dir per test run so tests don't share state
const configDir = join(tmpdir(), 'claude-code-sandbox-test-' + randomUUID());

describe('config-store', () => {
    it('returns empty config when no file exists', () => {
        const config = loadConfig(join(tmpdir(), 'nonexistent-' + randomUUID()));
        expect(config.version).toBe(1);
        expect(config.containers).toEqual({});
        expect(config.settings.defaultImage).toBe('spiriyu/claude-code-sandbox');
        expect(config.settings.defaultTag).toBe('latest');
        expect(config.settings.authMethod).toBeNull();
        expect(config.settings.currentContainerId).toBeNull();
    });

    it('roundtrips save and load', () => {
        const config = loadConfig(configDir);
        config.settings.authMethod = 'api_key';
        saveConfig(config, configDir);

        const loaded = loadConfig(configDir);
        expect(loaded.settings.authMethod).toBe('api_key');
    });

    it('preserves containers across save/load', () => {
        const config = loadConfig(configDir);
        const now = new Date().toISOString();
        config.containers['test-uuid'] = {
            id: 'test-uuid',
            name: 'claude-code-sandbox-testuuid',
            workspace: '/tmp/test',
            image: 'spiriyu/claude-code-sandbox',
            tag: 'latest',
            createdAt: now,
            updatedAt: now,
            lastStatus: 'running',
            removedAt: null,
        };
        saveConfig(config, configDir);

        const loaded = loadConfig(configDir);
        expect(loaded.containers['test-uuid']).toBeDefined();
        expect(loaded.containers['test-uuid'].workspace).toBe('/tmp/test');
    });

    it('handles corrupt JSON gracefully', () => {
        // Save then corrupt the file
        const config = loadConfig(configDir);
        saveConfig(config, configDir);

        writeFileSync(join(configDir, 'config.json'), 'not valid json');

        const loaded = loadConfig(configDir);
        expect(loaded.version).toBe(1);
        expect(loaded.containers).toEqual({});
    });
});
