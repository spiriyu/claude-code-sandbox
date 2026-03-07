import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    formatRelativeTime,
    shortId,
    containerNameFromId,
    mapDockerState,
    getContainerStates,
} from './docker.js';

// ─── Mock dockerode ───────────────────────────────────────────────────────────
// vi.hoisted ensures dockerMock is available when the vi.mock factory runs.
// mockReturnValue(obj) makes every `new Docker()` call return the same object,
// which aligns with docker.ts's module-level _client singleton.

const dockerMock = vi.hoisted(() => ({
    ping: vi.fn(),
    listContainers: vi.fn<[object], Promise<Array<{ Names: string[]; State: string }>>>().mockResolvedValue([]),
}));

vi.mock('dockerode', () => {
    // Use a plain named function — arrow functions cannot be `new`-ed.
    // Assign dockerMock properties onto `this` so the singleton `_client`
    // shares the same vi.fn() references that tests can control.
    function MockDocker(this: Record<string, unknown>) {
        Object.assign(this, dockerMock);
    }
    return { default: MockDocker };
});

// ─── formatRelativeTime ───────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
    it('formats seconds', () => {
        const date = new Date(Date.now() - 45_000);
        expect(formatRelativeTime(date)).toBe('45s ago');
    });

    it('formats minutes', () => {
        const date = new Date(Date.now() - 5 * 60_000);
        expect(formatRelativeTime(date)).toBe('5m ago');
    });

    it('formats hours', () => {
        const date = new Date(Date.now() - 2 * 3600_000);
        expect(formatRelativeTime(date)).toBe('2h ago');
    });

    it('formats days', () => {
        const date = new Date(Date.now() - 3 * 86400_000);
        expect(formatRelativeTime(date)).toBe('3d ago');
    });

    it('formats 0 seconds', () => {
        const date = new Date(Date.now());
        expect(formatRelativeTime(date)).toMatch(/^\ds ago$/);
    });

    it('formats boundary at exactly 59 seconds', () => {
        const date = new Date(Date.now() - 59_000);
        expect(formatRelativeTime(date)).toBe('59s ago');
    });

    it('formats boundary at exactly 60 seconds as 1m', () => {
        const date = new Date(Date.now() - 60_000);
        expect(formatRelativeTime(date)).toBe('1m ago');
    });
});

// ─── shortId ──────────────────────────────────────────────────────────────────

describe('shortId', () => {
    it('returns first 8 hex chars of UUID', () => {
        expect(shortId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('a1b2c3d4');
    });

    it('strips dashes before slicing', () => {
        expect(shortId('a1b2c3d4-0000-0000-0000-000000000000')).toBe('a1b2c3d4');
    });
});

// ─── containerNameFromId ──────────────────────────────────────────────────────

describe('containerNameFromId', () => {
    it('prefixes with claude-code-sandbox-', () => {
        const name = containerNameFromId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
        expect(name).toBe('claude-code-sandbox-a1b2c3d4');
    });
});

// ─── mapDockerState ───────────────────────────────────────────────────────────

describe('mapDockerState', () => {
    it('maps known states correctly', () => {
        expect(mapDockerState('running')).toBe('running');
        expect(mapDockerState('exited')).toBe('exited');
        expect(mapDockerState('paused')).toBe('paused');
        expect(mapDockerState('created')).toBe('created');
        expect(mapDockerState('dead')).toBe('dead');
        expect(mapDockerState('removing')).toBe('dead');
        expect(mapDockerState('unknown_state')).toBe('unknown');
    });

    it('maps empty string to unknown', () => {
        expect(mapDockerState('')).toBe('unknown');
    });
});

// ─── getContainerStates ───────────────────────────────────────────────────────

describe('getContainerStates', () => {
    beforeEach(() => {
        dockerMock.listContainers.mockClear();
        dockerMock.listContainers.mockResolvedValue([]);
    });

    it('returns empty map and does not call Docker when names array is empty', async () => {
        const result = await getContainerStates([]);
        expect(result.size).toBe(0);
        expect(dockerMock.listContainers).not.toHaveBeenCalled();
    });

    it('returns matching container with correct status', async () => {
        dockerMock.listContainers.mockResolvedValue([
            { Names: ['/claude-code-sandbox-a1b2c3d4'], State: 'running' },
        ]);
        const result = await getContainerStates(['claude-code-sandbox-a1b2c3d4']);
        expect(result.get('claude-code-sandbox-a1b2c3d4')).toBe('running');
    });

    it('strips the leading slash from Docker container names', async () => {
        dockerMock.listContainers.mockResolvedValue([
            { Names: ['/claude-code-sandbox-a1b2c3d4'], State: 'exited' },
        ]);
        const result = await getContainerStates(['claude-code-sandbox-a1b2c3d4']);
        expect(result.has('claude-code-sandbox-a1b2c3d4')).toBe(true);
        expect(result.has('/claude-code-sandbox-a1b2c3d4')).toBe(false);
    });

    it('returns only the requested subset of containers', async () => {
        dockerMock.listContainers.mockResolvedValue([
            { Names: ['/claude-code-sandbox-a1b2c3d4'], State: 'running' },
            { Names: ['/claude-code-sandbox-b2b2b2b2'], State: 'exited' },
        ]);
        const result = await getContainerStates(['claude-code-sandbox-a1b2c3d4']);
        expect(result.size).toBe(1);
        expect(result.has('claude-code-sandbox-b2b2b2b2')).toBe(false);
    });

    it('returns empty map when none of the requested names exist in Docker', async () => {
        dockerMock.listContainers.mockResolvedValue([
            { Names: ['/unrelated-container'], State: 'running' },
        ]);
        const result = await getContainerStates(['claude-code-sandbox-a1b2c3d4']);
        expect(result.size).toBe(0);
    });

    it('handles multiple containers all matching', async () => {
        dockerMock.listContainers.mockResolvedValue([
            { Names: ['/claude-code-sandbox-a1b2c3d4'], State: 'running' },
            { Names: ['/claude-code-sandbox-b2b2b2b2'], State: 'paused' },
        ]);
        const result = await getContainerStates([
            'claude-code-sandbox-a1b2c3d4',
            'claude-code-sandbox-b2b2b2b2',
        ]);
        expect(result.get('claude-code-sandbox-a1b2c3d4')).toBe('running');
        expect(result.get('claude-code-sandbox-b2b2b2b2')).toBe('paused');
    });
});
