import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    applySandboxUpdate,
    copySandboxConfig,
    diffAgainstManifest,
    hasDrift,
    hashFile,
    readManifest,
    renderDiff,
    resolveSandboxSources,
    SANDBOX_CONFIG_DIRNAME,
    SANDBOX_MANIFEST_FILE,
} from './sandbox-config.js';

function makeTmp(): string {
    return mkdtempSync(join(tmpdir(), 'sandbox-cfg-'));
}

function write(path: string, content: string): void {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
}

describe('sandbox-config', () => {
    let root: string;
    let configDir: string;
    let workspace: string;
    let dest: string;

    beforeEach(() => {
        root = makeTmp();
        configDir = join(root, 'cfg');
        workspace = join(root, 'ws');
        dest = join(root, 'dest');
        mkdirSync(configDir, { recursive: true });
        mkdirSync(workspace, { recursive: true });
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    describe('resolveSandboxSources', () => {
        it('returns empty map when no layers exist', () => {
            expect(resolveSandboxSources(configDir, workspace).size).toBe(0);
        });

        it('reads files from the global layer', () => {
            write(join(configDir, 'sandbox/init.sh'), '#!/bin/bash\necho hi');
            write(join(configDir, 'sandbox/MEMORY.md'), '# mem');
            const src = resolveSandboxSources(configDir, workspace);
            expect(src.size).toBe(2);
            expect(src.has('init.sh')).toBe(true);
            expect(src.has('MEMORY.md')).toBe(true);
        });

        it('reads files from the workspace layer', () => {
            write(join(workspace, SANDBOX_CONFIG_DIRNAME, 'loop.sh'), 'echo loop');
            const src = resolveSandboxSources(configDir, workspace);
            expect(src.size).toBe(1);
            expect(src.get('loop.sh')).toBe(join(workspace, SANDBOX_CONFIG_DIRNAME, 'loop.sh'));
        });

        it('workspace overrides global on a per-file basis', () => {
            write(join(configDir, 'sandbox/MEMORY.md'), 'global');
            write(join(configDir, 'sandbox/init.sh'), 'global init');
            write(join(workspace, SANDBOX_CONFIG_DIRNAME, 'MEMORY.md'), 'ws');
            const src = resolveSandboxSources(configDir, workspace);
            expect(src.size).toBe(2);
            expect(src.get('MEMORY.md')).toBe(join(workspace, SANDBOX_CONFIG_DIRNAME, 'MEMORY.md'));
            expect(src.get('init.sh')).toBe(join(configDir, 'sandbox/init.sh'));
        });

        it('recurses into subdirectories like files/', () => {
            write(join(configDir, 'sandbox/files/a.txt'), 'A');
            write(join(configDir, 'sandbox/files/nested/b.txt'), 'B');
            const src = resolveSandboxSources(configDir, workspace);
            expect(new Set(src.keys())).toEqual(new Set(['files/a.txt', 'files/nested/b.txt']));
        });
    });

    describe('copySandboxConfig + readManifest', () => {
        it('copies files and writes a manifest', () => {
            write(join(configDir, 'sandbox/init.sh'), 'echo hi');
            write(join(configDir, 'sandbox/MEMORY.md'), '# mem');
            const sources = resolveSandboxSources(configDir, workspace);
            const manifest = copySandboxConfig(sources, dest);

            expect(existsSync(join(dest, 'init.sh'))).toBe(true);
            expect(existsSync(join(dest, 'MEMORY.md'))).toBe(true);
            expect(existsSync(join(dest, SANDBOX_MANIFEST_FILE))).toBe(true);
            expect(readFileSync(join(dest, 'init.sh'), 'utf-8')).toBe('echo hi');

            expect(manifest.version).toBe(1);
            expect(manifest.entries).toHaveLength(2);
            for (const e of manifest.entries) {
                expect(e.sha).toMatch(/^[0-9a-f]{64}$/);
            }

            const persisted = readManifest(dest);
            expect(persisted).toEqual(manifest);
        });

        it('skips manifest/init-marker when rewalking an existing dest', () => {
            // Previously-copied dest contains manifest + init-done
            mkdirSync(dest, { recursive: true });
            writeFileSync(join(dest, SANDBOX_MANIFEST_FILE), '{"version":1,"entries":[]}');
            writeFileSync(join(dest, '.init-done'), '');
            // If we point resolveSandboxSources at dest as if it were a layer,
            // it must not pick up those internal files.
            const sources = resolveSandboxSources(dest, workspace); // no 'sandbox' subdir → empty
            expect(sources.size).toBe(0);
        });
    });

    describe('diffAgainstManifest', () => {
        beforeEach(() => {
            write(join(configDir, 'sandbox/init.sh'), 'echo hi');
            write(join(configDir, 'sandbox/MEMORY.md'), '# v1');
            copySandboxConfig(resolveSandboxSources(configDir, workspace), dest);
        });

        it('reports no drift when sources are unchanged', () => {
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), dest);
            expect(hasDrift(diff)).toBe(false);
        });

        it('detects changed files', () => {
            write(join(configDir, 'sandbox/MEMORY.md'), '# v2');
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), dest);
            expect(diff.changed).toEqual(['MEMORY.md']);
            expect(diff.added).toEqual([]);
            expect(diff.removed).toEqual([]);
            expect(hasDrift(diff)).toBe(true);
        });

        it('detects added files', () => {
            write(join(configDir, 'sandbox/loop.sh'), 'echo loop');
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), dest);
            expect(diff.added).toEqual(['loop.sh']);
        });

        it('detects removed files', () => {
            rmSync(join(configDir, 'sandbox/init.sh'));
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), dest);
            expect(diff.removed).toEqual(['init.sh']);
        });

        it('returns added-only when no manifest exists', () => {
            const freshDest = join(root, 'fresh');
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), freshDest);
            expect(new Set(diff.added)).toEqual(new Set(['init.sh', 'MEMORY.md']));
            expect(diff.changed).toEqual([]);
            expect(diff.removed).toEqual([]);
        });
    });

    describe('renderDiff', () => {
        it('formats added/changed/removed with prefixes', () => {
            const out = renderDiff({ added: ['a.txt'], changed: ['b.txt'], removed: ['c.txt'] });
            expect(out).toContain('+ a.txt');
            expect(out).toContain('~ b.txt');
            expect(out).toContain('- c.txt');
        });
    });

    describe('applySandboxUpdate', () => {
        beforeEach(() => {
            write(join(configDir, 'sandbox/init.sh'), 'echo hi');
            write(join(configDir, 'sandbox/MEMORY.md'), '# v1');
            copySandboxConfig(resolveSandboxSources(configDir, workspace), dest);
            // Simulate the one-time init marker created by the entrypoint
            writeFileSync(join(dest, '.init-done'), '');
        });

        it('copies changed files and preserves the init marker', () => {
            write(join(configDir, 'sandbox/MEMORY.md'), '# v2');
            applySandboxUpdate(resolveSandboxSources(configDir, workspace), dest);
            expect(readFileSync(join(dest, 'MEMORY.md'), 'utf-8')).toBe('# v2');
            expect(existsSync(join(dest, '.init-done'))).toBe(true);
        });

        it('removes files that no longer exist in sources', () => {
            rmSync(join(configDir, 'sandbox/init.sh'));
            applySandboxUpdate(resolveSandboxSources(configDir, workspace), dest);
            expect(existsSync(join(dest, 'init.sh'))).toBe(false);
        });

        it('rewrites the manifest so drift clears', () => {
            write(join(configDir, 'sandbox/MEMORY.md'), '# v2');
            applySandboxUpdate(resolveSandboxSources(configDir, workspace), dest);
            const diff = diffAgainstManifest(resolveSandboxSources(configDir, workspace), dest);
            expect(hasDrift(diff)).toBe(false);
        });
    });

    describe('hashFile', () => {
        it('returns stable sha256 hex', () => {
            const p = join(root, 'f.txt');
            writeFileSync(p, 'hello');
            // sha256("hello")
            expect(hashFile(p)).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
        });
    });
});
