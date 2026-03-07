import { type ConfigFile, type ContainerRecord, type ContainerStatus } from './config-store.js';

export function getAllContainers(config: ConfigFile, includeRemoved = false): ContainerRecord[] {
    const all = Object.values(config.containers);
    return includeRemoved ? all : all.filter(c => c.removedAt === null);
}

/** Matches full UUID or short-ID prefix (first 8 chars). */
export function findContainerById(config: ConfigFile, id: string): ContainerRecord | undefined {
    if (config.containers[id]) return config.containers[id];
    const lower = id.toLowerCase();
    return Object.values(config.containers).find(c => c.id.toLowerCase().startsWith(lower));
}

/** Returns all non-removed containers whose workspace matches exactly. */
export function findContainersByWorkspace(config: ConfigFile, workspace: string): ContainerRecord[] {
    return Object.values(config.containers).filter(
        c => c.workspace === workspace && c.removedAt === null,
    );
}

export function addContainer(config: ConfigFile, record: ContainerRecord): void {
    config.containers[record.id] = record;
}

export function updateContainer(
    config: ConfigFile,
    id: string,
    patch: Partial<ContainerRecord>,
): void {
    const record = findContainerById(config, id);
    if (!record) return;
    config.containers[record.id] = {
        ...record,
        ...patch,
        updatedAt: new Date().toISOString(),
    };
}

export function markContainerRemoved(config: ConfigFile, id: string): void {
    updateContainer(config, id, {
        lastStatus: 'removed',
        removedAt: new Date().toISOString(),
    });
}

/**
 * Bulk-update lastStatus from Docker query results.
 * Containers not found in Docker are marked 'unknown'.
 * @param dockerStates key = Docker container name, value = status
 */
export function syncContainerStatuses(
    config: ConfigFile,
    dockerStates: Map<string, ContainerStatus>,
): void {
    const now = new Date().toISOString();
    for (const record of Object.values(config.containers)) {
        if (record.removedAt !== null) continue;
        const status = dockerStates.get(record.name);
        record.lastStatus = status ?? 'unknown';
        record.updatedAt = now;
    }
}
