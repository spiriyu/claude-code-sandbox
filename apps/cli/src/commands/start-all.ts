import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses, updateContainer } from '../lib/container-store.js';
import { isDockerRunning, getContainerStates, startExistingContainer, shortId } from '../lib/docker.js';
import { logger } from '../utils/logger.js';

export function makeStartAllCommand(): Command {
    return new Command('start-all')
        .description('Start all stopped containers (does not create new ones)')
        .action(async function(this: Command) {
            const g = this.optsWithGlobals() as { configDir: string };

            if (!await isDockerRunning()) {
                logger.error('Docker is not running or not accessible.');
                process.exit(1);
            }

            const config = loadConfig(g.configDir);
            const containers = getAllContainers(config, false);

            if (containers.length === 0) {
                logger.info('No containers found. Run `claude-code-sandbox start` to create one.');
                return;
            }

            const names = containers.map(c => c.name);
            syncContainerStatuses(config, await getContainerStates(names));

            const toStart = getAllContainers(config, false).filter(
                c => c.lastStatus !== 'running' && c.lastStatus !== 'paused',
            );

            if (toStart.length === 0) {
                logger.info('All containers are already running.');
                return;
            }

            let started = 0;
            for (const c of toStart) {
                process.stdout.write(`  ${shortId(c.id)}  ${c.workspace.slice(-40).padEnd(40)} `);
                try {
                    await startExistingContainer(c.name);
                    updateContainer(config, c.id, { lastStatus: 'running' });
                    process.stdout.write(chalk.green('✓') + '\n');
                    started++;
                } catch {
                    process.stdout.write(chalk.red('✗') + '\n');
                }
            }

            saveConfig(config, g.configDir);
            logger.success(`Started ${started}/${toStart.length} containers`);
        });
}
