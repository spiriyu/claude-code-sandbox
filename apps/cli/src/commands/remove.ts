import { Command } from 'commander';
import { logger, spinner } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses, markContainerRemoved } from '../lib/container-store.js';
import { resolveContainer } from '../lib/selection.js';
import { isDockerRunning, getContainerStates, stopExistingContainer, removeContainerFromDocker, shortId } from '../lib/docker.js';

export function makeRemoveCommand(): Command {
    return new Command('remove')
        .description('Remove a container from Docker (stop if running, preserve in history)')
        .option('-f, --force', 'Skip confirmation prompt')
        .action(async function (this: Command, opts: { force?: boolean }) {
            const g = this.optsWithGlobals();

            if (!(await isDockerRunning())) {
                logger.error('Docker is not running or not accessible.');
                process.exit(1);
            }

            const config = loadConfig(String(g.configDir));
            const allNames = getAllContainers(config).map((c) => c.name);
            syncContainerStatuses(config, await getContainerStates(allNames));

            const container = await resolveContainer(config, { id: g.id as string | undefined, workspace: g.workspace as string | undefined });
            if (!container) {
                logger.error('No container found. Run `claude-code-sandbox ls` to see available containers.');
                process.exit(1);
            }

            if (!opts.force) {
                const { confirm } = await import('@inquirer/prompts');
                const ok = await confirm({
                    message: `Remove container ${shortId(container.id)} (${container.workspace})?`,
                    default: false,
                });
                if (!ok) {
                    logger.info('Cancelled.');
                    return;
                }
            }

            // Stop first if running
            if (container.lastStatus === 'running' || container.lastStatus === 'paused') {
                const spin = spinner(`Stopping ${container.name}...`).start();
                try {
                    await stopExistingContainer(container.name);
                    spin.succeed('Stopped');
                } catch (err) {
                    spin.fail('Failed to stop container');
                    logger.error((err as Error).message);
                    process.exit(1);
                }
            }

            const spin = spinner(`Removing ${container.name}...`).start();
            try {
                await removeContainerFromDocker(container.name);
                markContainerRemoved(config, container.id);

                // Clear currentContainerId if it was this one
                if (config.settings.currentContainerId === container.id) {
                    config.settings.currentContainerId = null;
                }

                saveConfig(config, String(g.configDir));
                spin.succeed(`Container ${shortId(container.id)} removed`);
                console.log('  Run `claude-code-sandbox history` to view removed containers.');
                console.log('  Run `claude-code-sandbox start` to create a new one for this workspace.');
            } catch (err) {
                spin.fail('Failed to remove container');
                logger.error((err as Error).message);
                process.exit(1);
            }
        });
}
