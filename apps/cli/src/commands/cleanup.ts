import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig, DEFAULT_CLEANUP_DAYS } from '../lib/config-store.js';
import { getAllContainers } from '../lib/container-store.js';
import { shortId } from '../lib/docker.js';
import { logger } from '../utils/logger.js';

export function makeCleanupCommand(): Command {
    return new Command('cleanup')
        .description('Remove history data for containers removed more than N days ago')
        .option('-d, --days <number>', 'Number of days (overrides settings)')
        .option('-f, --force', 'Skip confirmation prompt')
        .action(async function (this: Command, opts: { days?: string; force?: boolean }) {
            const g = this.optsWithGlobals();
            const config = loadConfig(String(g.configDir));

            const days = opts.days !== undefined ? parseInt(opts.days, 10) : config.settings.cleanupDays;
            if (isNaN(days) || days < 0) {
                logger.error(`Invalid days value. Must be a non-negative integer.`);
                process.exit(1);
            }

            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
            const removed = getAllContainers(config, true).filter(
                (c) => c.removedAt !== null && new Date(c.removedAt).getTime() < cutoff
            );

            if (removed.length === 0) {
                logger.info(`No removed containers older than ${days} days found.`);
                return;
            }

            console.log(chalk.yellow(`\n  Found ${removed.length} container(s) removed more than ${days} days ago:`));
            for (const c of removed) {
                const removedDate = new Date(c.removedAt!).toLocaleDateString();
                console.log(`    ${shortId(c.id)}  ${c.workspace.slice(-40).padEnd(40)}  removed ${removedDate}`);
            }
            console.log('');

            if (!opts.force) {
                const { confirm } = await import('@inquirer/prompts');
                const ok = await confirm({
                    message: `Permanently delete ${removed.length} container record(s) from history? This cannot be undone.`,
                    default: false,
                });
                if (!ok) {
                    logger.info('Cancelled.');
                    return;
                }
            }

            let cleaned = 0;
            for (const c of removed) {
                delete config.containers[c.id];
                cleaned++;
            }

            saveConfig(config, String(g.configDir));
            logger.success(`Cleaned up ${cleaned} container record(s) from history.`);
        });
}
