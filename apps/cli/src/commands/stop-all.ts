import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses, updateContainer } from '../lib/container-store.js';
import { isDockerRunning, getContainerStates, stopExistingContainer, shortId } from '../lib/docker.js';
import { logger } from '../utils/logger.js';

export function makeStopAllCommand(): Command {
    return new Command('stop-all').description('Stop all running containers').action(async function (this: Command) {
        const g = this.optsWithGlobals();

        if (!(await isDockerRunning())) {
            logger.error('Docker is not running or not accessible.');
            process.exit(1);
        }

        const config = loadConfig(String(g.configDir));
        const containers = getAllContainers(config, false);

        if (containers.length === 0) {
            logger.info('No containers found.');
            return;
        }

        const names = containers.map((c) => c.name);
        syncContainerStatuses(config, await getContainerStates(names));

        const running = getAllContainers(config, false).filter((c) => c.lastStatus === 'running' || c.lastStatus === 'paused');

        if (running.length === 0) {
            logger.info('No running containers.');
            return;
        }

        let stopped = 0;
        for (const c of running) {
            process.stdout.write(`  ${shortId(c.id)}  ${c.workspace.slice(-40).padEnd(40)} `);
            try {
                await stopExistingContainer(c.name);
                updateContainer(config, c.id, { lastStatus: 'exited' });
                process.stdout.write(chalk.green('✓') + '\n');
                stopped++;
            } catch {
                process.stdout.write(chalk.red('✗') + '\n');
            }
        }

        saveConfig(config, String(g.configDir));
        logger.success(`Stopped ${stopped}/${running.length} containers`);
    });
}
