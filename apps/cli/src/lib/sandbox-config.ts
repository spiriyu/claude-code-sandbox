import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync, chmodSync, unlinkSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { DEFAULT_CONFIG_DIR } from './constants.js';

/**
 * Directory name for user-provided sandbox config (init.sh, loop.sh, MEMORY.md, files/).
 * Searched both globally (inside the CLI config dir) and per-workspace.
 */
export const SANDBOX_CONFIG_DIRNAME = '.claude-code-sandbox';
export const SANDBOX_CONFIG_CONTAINER_PATH = '/home/dev/.claude/.claude-code-sandbox';
export const SANDBOX_MANIFEST_FILE = '.manifest.json';
export const SANDBOX_INIT_MARKER = '.init-done';
export const SANDBOX_INIT_SCRIPT_REL = 'init.sh';
export const SANDBOX_LOOP_SCRIPT_REL = 'loop.sh';

export interface ManifestEntry {
    /** Relative path inside the sandbox-config dir (e.g. "init.sh", "files/foo.txt"). */
    rel: string;
    /** sha256 hex of the file contents at copy time. */
    sha: string;
    /** Absolute source path on host it was copied from (for user feedback only). */
    src: string;
}

export interface Manifest {
    version: 1;
    entries: ManifestEntry[];
}

export interface SandboxDiff {
    added: string[];
    removed: string[];
    changed: string[];
}

/**
 * Resolved map of relative path → absolute source path on host.
 * Later layers (workspace) override earlier layers (global) on a per-file basis.
 */
export type SandboxSources = Map<string, string>;

/**
 * Compute sha256 of a file's contents. Streams are overkill for the small config
 * files we expect here — read into memory and hash.
 */
export function hashFile(absPath: string): string {
    return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

function walkFiles(root: string): string[] {
    const out: string[] = [];
    if (!existsSync(root)) return out;
    const stack: string[] = [root];
    while (stack.length) {
        const dir = stack.pop() as string;
        for (const entry of readdirSync(dir)) {
            // Skip the manifest and init marker so they can't collide with user files
            if (dir === root && (entry === SANDBOX_MANIFEST_FILE || entry === SANDBOX_INIT_MARKER)) continue;
            const full = join(dir, entry);
            const st = statSync(full);
            if (st.isDirectory()) stack.push(full);
            else if (st.isFile()) out.push(full);
        }
    }
    return out;
}

/**
 * Resolve sandbox sources by merging global (CLI config dir) and workspace layers.
 * Workspace entries override global entries on a per-file basis.
 */
export function resolveSandboxSources(configDir: string, workspace: string): SandboxSources {
    const globalDir = join(configDir ?? DEFAULT_CONFIG_DIR, 'sandbox');
    const workspaceDir = join(workspace, SANDBOX_CONFIG_DIRNAME);

    const merged: SandboxSources = new Map();

    for (const layerRoot of [globalDir, workspaceDir]) {
        if (!existsSync(layerRoot)) continue;
        for (const abs of walkFiles(layerRoot)) {
            const rel = relative(layerRoot, abs).split(/[\\/]/).join('/');
            merged.set(rel, resolve(abs));
        }
    }

    return merged;
}

/**
 * Copy all resolved sources into destDir and write a manifest alongside.
 * destDir is created if missing; existing files under it are overwritten (matching
 * entries) but foreign files (e.g. the init marker) are left alone.
 */
export function copySandboxConfig(sources: SandboxSources, destDir: string): Manifest {
    mkdirSync(destDir, { recursive: true });

    const entries: ManifestEntry[] = [];
    for (const [rel, src] of sources) {
        const dest = join(destDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
        // Preserve +x on shell scripts so the entrypoint can bash them directly.
        if (rel.endsWith('.sh')) {
            try {
                chmodSync(dest, 0o755);
            } catch {
                /* non-POSIX FS — ignore */
            }
        }
        entries.push({ rel, sha: hashFile(src), src });
    }

    const manifest: Manifest = { version: 1, entries };
    writeFileSync(join(destDir, SANDBOX_MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    return manifest;
}

export function readManifest(destDir: string): Manifest | null {
    const path = join(destDir, SANDBOX_MANIFEST_FILE);
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as Manifest;
    } catch {
        return null;
    }
}

/**
 * Compare the current resolved sources against a previously-copied manifest.
 * Returns lists of added/removed/changed relative paths. Sources that no longer
 * exist on disk are treated as removed.
 */
export function diffAgainstManifest(sources: SandboxSources, destDir: string): SandboxDiff {
    const manifest = readManifest(destDir);
    const diff: SandboxDiff = { added: [], removed: [], changed: [] };

    const prev = new Map<string, ManifestEntry>();
    if (manifest) for (const e of manifest.entries) prev.set(e.rel, e);

    for (const [rel, src] of sources) {
        const prior = prev.get(rel);
        if (!prior) {
            diff.added.push(rel);
            continue;
        }
        const sha = existsSync(src) ? hashFile(src) : null;
        if (sha !== prior.sha) diff.changed.push(rel);
    }
    for (const rel of prev.keys()) {
        if (!sources.has(rel)) diff.removed.push(rel);
    }

    diff.added.sort();
    diff.removed.sort();
    diff.changed.sort();
    return diff;
}

export function hasDrift(diff: SandboxDiff): boolean {
    return diff.added.length + diff.removed.length + diff.changed.length > 0;
}

export function renderDiff(diff: SandboxDiff): string {
    const lines: string[] = [];
    for (const rel of diff.added) lines.push(`  + ${rel}`);
    for (const rel of diff.changed) lines.push(`  ~ ${rel}`);
    for (const rel of diff.removed) lines.push(`  - ${rel}`);
    return lines.join('\n');
}

/**
 * Apply an update to an existing container's sandbox-config dir:
 * copies new/changed files, removes files that no longer exist in sources,
 * and rewrites the manifest. Does NOT touch the init marker — "on-create"
 * hooks remain strictly once.
 */
export function applySandboxUpdate(sources: SandboxSources, destDir: string): Manifest {
    const diff = diffAgainstManifest(sources, destDir);
    for (const rel of diff.removed) {
        const p = join(destDir, rel);
        try {
            if (existsSync(p)) unlinkSync(p);
        } catch {
            /* ignore */
        }
    }
    return copySandboxConfig(sources, destDir);
}
