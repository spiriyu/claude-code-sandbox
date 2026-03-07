import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses } from '../lib/container-store.js';
import { isDockerRunning, getContainerStates, formatRelativeTime, shortId } from '../lib/docker.js';
import { logger } from '../utils/logger.js';

export function makeLsCommand(): Command {
    return new Command('ls')
        .description('List all active containers')
        .option('--json', 'Output as JSON')
        .action(async function(this: Command, opts: { json?: boolean }) {
            const g = this.optsWithGlobals() as { configDir: string };

            if (!await isDockerRunning()) {
                logger.error('Docker is not running or not accessible.');
                process.exit(1);
            }

            const config = loadConfig(g.configDir);
            const containers = getAllContainers(config, false);
            const names = containers.map(c => c.name);
            syncContainerStatuses(config, await getContainerStates(names));
            saveConfig(config, g.configDir);

            const active = getAllContainers(config, false);

            if (opts.json) {
                console.log(JSON.stringify(active, null, 2));
                return;
            }

            if (active.length === 0) {
                logger.info('No containers found. Run `claude-code-sandbox start` to create one.');
                return;
            }

            const currentId = config.settings.currentContainerId;

            // Header
            console.log(
                '  ' +
                '  '.padEnd(2) +
                chalk.bold('ID'.padEnd(10)) +
                chalk.bold('WORKSPACE'.padEnd(38)) +
                chalk.bold('STATUS'.padEnd(12)) +
                chalk.bold('IMAGE:TAG'.padEnd(36)) +
                chalk.bold('CREATED'),
            );
            console.log('  ' + chalk.gray('─'.repeat(105)));

            for (const c of active) {
                const marker = c.id === currentId ? chalk.cyan('* ') : '  ';
                const id = chalk.cyan(shortId(c.id).padEnd(10));
                const ws = (c.workspace.length > 36 ? '...' + c.workspace.slice(-33) : c.workspace).padEnd(38);
                const status = colorStatus(c.lastStatus).padEnd(22); // chalk adds escape codes
                const image = `${c.image}:${c.tag}`.slice(0, 34).padEnd(36);
                const age = formatRelativeTime(new Date(c.createdAt));
                console.log(`${marker}${id}${ws}${status}${image}${age}`);
            }
        });
}

function colorStatus(status: string): string {
    switch (status) {
        case 'running': return chalk.green(status);
        case 'exited': return chalk.yellow(status);
        case 'paused': return chalk.blue(status);
        case 'dead':
        case 'unknown': return chalk.red(status);
        default: return chalk.gray(status);
    }
}
