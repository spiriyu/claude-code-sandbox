import { Command } from 'commander';
import { logger, spinner } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses, updateContainer } from '../lib/container-store.js';
import { resolveContainer } from '../lib/selection.js';
import { isDockerRunning, getContainerStates, stopExistingContainer } from '../lib/docker.js';

export function makeStopCommand(): Command {
    return new Command('stop').description('Stop the selected container').action(async function (this: Command) {
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

        if (container.lastStatus !== 'running' && container.lastStatus !== 'paused') {
            logger.info(`Container ${container.name} is not running (status: ${container.lastStatus}).`);
            return;
        }

        const spin = spinner(`Stopping ${container.name}...`).start();
        try {
            await stopExistingContainer(container.name);
            updateContainer(config, container.id, { lastStatus: 'exited' });
            saveConfig(config, String(g.configDir));
            spin.succeed(`Container ${container.name} stopped`);
        } catch (err) {
            spin.fail('Failed to stop container');
            logger.error((err as Error).message);
            process.exit(1);
        }
    });
}
