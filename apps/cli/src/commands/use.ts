import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, findContainerById, syncContainerStatuses } from '../lib/container-store.js';
import { isDockerRunning, getContainerStates, shortId } from '../lib/docker.js';
import { pickInteractively } from '../lib/selection.js';

export function makeUseCommand(): Command {
    return new Command('use')
        .description('Select the active container (persists until changed or cleared)')
        .argument('[id]', 'Container ID to select directly')
        .option('--clear', 'Clear the current selection')
        .action(async function(this: Command, idArg?: string, opts?: { clear?: boolean }) {
            const g = this.optsWithGlobals() as { configDir: string };

            if (opts?.clear) {
                const config = loadConfig(g.configDir);
                config.settings.currentContainerId = null;
                saveConfig(config, g.configDir);
                logger.success('Container selection cleared.');
                return;
            }

            if (!await isDockerRunning()) {
                logger.error('Docker is not running or not accessible.');
                process.exit(1);
            }

            const config = loadConfig(g.configDir);

            // Get all non-removed containers from config
            const candidates = getAllContainers(config, false);
            if (candidates.length === 0) {
                logger.error('No containers found. Run `claude-code-sandbox start` to create one.');
                process.exit(1);
            }

            // Filter to only containers that actually exist in Docker
            const names = candidates.map(c => c.name);
            const dockerStates = await getContainerStates(names);
            syncContainerStatuses(config, dockerStates);

            const dockerVerified = candidates.filter(c => dockerStates.has(c.name));

            if (dockerVerified.length === 0) {
                logger.error('No containers found in Docker. They may have been removed externally.');
                logger.info('Run `claude-code-sandbox start` to create a new one.');
                process.exit(1);
            }

            let chosen = dockerVerified[0];

            if (idArg) {
                // Direct selection by id arg
                const record = findContainerById(config, idArg);
                if (!record || record.removedAt !== null) {
                    logger.error(`Container "${idArg}" not found.`);
                    process.exit(1);
                }
                if (!dockerStates.has(record.name)) {
                    logger.error(`Container "${idArg}" not found in Docker.`);
                    process.exit(1);
                }
                chosen = record;
            } else if (dockerVerified.length > 1) {
                // Interactive picker
                const picked = await pickInteractively(dockerVerified);
                if (!picked) { logger.info('No container selected.'); return; }
                chosen = picked;
            }

            config.settings.currentContainerId = chosen.id;
            saveConfig(config, g.configDir);
            logger.success(`Now using container ${shortId(chosen.id)}`);
            console.log(`  Workspace: ${chosen.workspace}`);
            console.log(`  Status:    ${chosen.lastStatus}`);
        });
}
