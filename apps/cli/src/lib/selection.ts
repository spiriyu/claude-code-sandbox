import chalk from 'chalk';
import { type ConfigFile, type ContainerRecord } from './config-store.js';
import { findContainerById, findContainersByWorkspace } from './container-store.js';
import { resolveWorkspace } from './workspace.js';
import { getContainerStates, formatRelativeTime } from './docker.js';
import { logger } from '../utils/logger.js';
import { withEscBack } from './prompt-utils.js';

/**
 * Resolve a target container using the standard selection order:
 *  1. --id flag (validated against config + Docker)
 *  2. currentContainerId from settings
 *  3. workspace matching (flag → env → cwd)
 *  4. interactive prompt if multiple candidates
 *
 * Returns null if no container could be resolved.
 */
export async function resolveContainer(config: ConfigFile, opts: { id?: string; workspace?: string }): Promise<ContainerRecord | null> {
    // 1. --id flag
    if (opts.id) {
        const record = findContainerById(config, opts.id);
        if (!record || record.removedAt !== null) {
            logger.error(chalk.red(`Container "${opts.id}" not found.`));
            // Fall through — per spec, show red message then continue without the id
        } else {
            const states = await getContainerStates([record.name]);
            if (!states.has(record.name)) {
                logger.error(chalk.red(`Container "${opts.id}" not found in Docker.`));
                // Fall through
            } else {
                return record;
            }
        }
    }

    // 2. currentContainerId persisted by `use` command
    if (config.settings.currentContainerId) {
        const record = findContainerById(config, config.settings.currentContainerId);
        if (record && record.removedAt === null) return record;
    }

    // 3. Workspace matching
    const workspace = resolveWorkspace(opts.workspace);
    const candidates = findContainersByWorkspace(config, workspace);

    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) return pickInteractively(candidates);

    return null;
}

/** Show an interactive container picker. Only used when there is genuine ambiguity. */
export async function pickInteractively(containers: ContainerRecord[]): Promise<ContainerRecord | null> {
    if (containers.length === 0) return null;
    if (containers.length === 1) return containers[0];

    const { select } = await import('@inquirer/prompts');

    const chosen = await withEscBack((s) =>
        select<string>(
            {
                message: 'Select a container:',
                choices: containers.map((c) => ({
                    name: formatContainerLine(c),
                    value: c.id,
                })),
            },
            { signal: s }
        )
    );

    return containers.find((c) => c.id === chosen) ?? null;
}

export function formatContainerLine(c: ContainerRecord): string {
    const id = c.id.replace(/-/g, '').slice(0, 8);
    const ws = c.workspace.length > 35 ? '...' + c.workspace.slice(-32) : c.workspace;
    const status = c.lastStatus.padEnd(10);
    const age = formatRelativeTime(new Date(c.createdAt));
    return `${id}  ${ws.padEnd(35)}  ${status}  ${age}`;
}
