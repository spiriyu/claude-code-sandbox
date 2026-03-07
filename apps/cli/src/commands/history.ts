import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../lib/config-store.js';
import { getAllContainers } from '../lib/container-store.js';
import { formatRelativeTime, shortId } from '../lib/docker.js';
import { logger } from '../utils/logger.js';

export function makeHistoryCommand(): Command {
    return new Command('history')
        .description('List all containers including removed ones')
        .option('--json', 'Output as JSON')
        .action(function(this: Command, opts: { json?: boolean }) {
            const g = this.optsWithGlobals() as { configDir: string };

            const config = loadConfig(g.configDir);
            const all = getAllContainers(config, true);

            if (opts.json) {
                console.log(JSON.stringify(all, null, 2));
                return;
            }

            if (all.length === 0) {
                logger.info('No container history found. Run `claude-code-sandbox start` to create one.');
                return;
            }

            const currentId = config.settings.currentContainerId;

            console.log(
                '  ' +
                '  '.padEnd(2) +
                chalk.bold('ID'.padEnd(10)) +
                chalk.bold('WORKSPACE'.padEnd(38)) +
                chalk.bold('STATUS'.padEnd(12)) +
                chalk.bold('CREATED'.padEnd(14)) +
                chalk.bold('REMOVED'),
            );
            console.log('  ' + chalk.gray('─'.repeat(90)));

            for (const c of all) {
                const marker = c.id === currentId ? chalk.cyan('* ') : '  ';
                const id = chalk.cyan(shortId(c.id).padEnd(10));
                const ws = (c.workspace.length > 36 ? '...' + c.workspace.slice(-33) : c.workspace).padEnd(38);
                const status = (c.removedAt ? chalk.gray(c.lastStatus) : colorStatus(c.lastStatus)).padEnd(22);
                const created = formatRelativeTime(new Date(c.createdAt)).padEnd(14);
                const removed = c.removedAt ? chalk.gray(formatRelativeTime(new Date(c.removedAt))) : '—';
                console.log(`${marker}${id}${ws}${status}${created}${removed}`);
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
