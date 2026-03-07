import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { getAllContainers, syncContainerStatuses } from '../lib/container-store.js';
import { resolveContainer } from '../lib/selection.js';
import { isDockerRunning, getContainerStates, execShellInContainer, shortId } from '../lib/docker.js';

export function makeShellCommand(): Command {
    return new Command('shell')
        .description('Open a new bash session inside the container (exit closes the session, not the container)')
        .action(async function(this: Command) {
            const g = this.optsWithGlobals() as { configDir: string; workspace?: string; id?: string };

            if (!await isDockerRunning()) {
                logger.error('Docker is not running or not accessible.');
                process.exit(1);
            }

            const config = loadConfig(g.configDir);
            const allNames = getAllContainers(config).map(c => c.name);
            syncContainerStatuses(config, await getContainerStates(allNames));
            saveConfig(config, g.configDir);

            const container = await resolveContainer(config, { id: g.id, workspace: g.workspace });
            if (!container) {
                logger.error('No container found. Run `claude-code-sandbox ls` to see available containers.');
                process.exit(1);
            }

            if (container.lastStatus !== 'running') {
                logger.error(
                    `Container ${shortId(container.id)} is not running (status: ${container.lastStatus}).`,
                );
                console.log('  Run `claude-code-sandbox start` to start it first.');
                process.exit(1);
            }

            logger.info(`Opening bash session in ${container.name}...`);
            try {
                await execShellInContainer(container.name);
            } catch (err) {
                logger.error((err as Error).message);
                process.exit(1);
            }
        });
}
