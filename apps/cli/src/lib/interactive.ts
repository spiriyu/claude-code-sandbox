import chalk from 'chalk';
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { DEFAULT_CONFIG_DIR } from './constants.js';
import { withEscBack } from './prompt-utils.js';

// Lazy-load @inquirer/prompts to avoid bundling CJS deps into the ESM top-level scope.
// (Same pattern as selection.ts — resolves the "Dynamic require of tty" esbuild issue.)
const getPrompts = () => import('@inquirer/prompts');

export interface GlobalOpts {
    configDir: string;
    workspace?: string;
    id?: string;
}

export function buildGlobalFlags(opts: GlobalOpts): string[] {
    const flags: string[] = [];
    if (opts.configDir !== DEFAULT_CONFIG_DIR) flags.push('--config-dir', opts.configDir);
    if (opts.workspace) flags.push('--workspace', opts.workspace);
    if (opts.id) flags.push('--id', opts.id);
    return flags;
}

const CONFIG_KEYS = [
    { name: 'defaultImage', value: 'defaultImage' },
    { name: 'defaultTag', value: 'defaultTag' },
    { name: 'authMethod', value: 'authMethod' },
    { name: 'gitUserName', value: 'gitUserName' },
    { name: 'gitUserEmail', value: 'gitUserEmail' },
];

export async function promptConfigGet(): Promise<string[]> {
    const { select } = await getPrompts();
    const key = await withEscBack(s =>
        select<string>({ message: 'Select setting key:', choices: CONFIG_KEYS }, { signal: s }),
    );
    return ['config', 'get', key];
}

export async function promptConfigSet(): Promise<string[]> {
    const { select, input } = await getPrompts();
    const key = await withEscBack(s =>
        select<string>({ message: 'Select setting key:', choices: CONFIG_KEYS }, { signal: s }),
    );
    const value = await withEscBack(s =>
        input({ message: `New value for ${key}:` }, { signal: s }),
    );
    return ['config', 'set', key, value];
}

export async function promptConfigReset(): Promise<string[]> {
    const { select } = await getPrompts();
    const scope = await withEscBack(s =>
        select<string>({
            message: 'Reset scope:',
            choices: [
                { name: 'All settings', value: 'all' },
                { name: 'Specific key', value: 'key' },
            ],
        }, { signal: s }),
    );
    if (scope === 'all') return ['config', 'reset'];
    const key = await withEscBack(s =>
        select<string>({ message: 'Select setting key:', choices: CONFIG_KEYS }, { signal: s }),
    );
    return ['config', 'reset', key];
}

/**
 * Show the main interactive menu. Returns the argv fragment to run, or null if
 * exit/help was handled internally (process.exit / program.help called).
 */
export async function promptMainMenu(program: Command): Promise<string[] | null> {
    const { select, Separator } = await getPrompts();
    const choice = await withEscBack(s => select<string>({
        message: 'Select an action:',
        choices: [
            new Separator('── Container Lifecycle ──'),
            { name: 'Start container', value: 'start' },
            { name: 'Stop container', value: 'stop' },
            { name: 'Start all stopped containers', value: 'start-all' },
            { name: 'Stop all running containers', value: 'stop-all' },
            { name: 'Remove a container', value: 'remove' },
            new Separator('── Attach & Shell ──'),
            { name: 'Attach to Claude Code process', value: 'attach' },
            { name: 'Open bash session', value: 'shell' },
            new Separator('── Inspect ──'),
            { name: 'List containers', value: 'ls' },
            { name: 'List all history (including removed)', value: 'history' },
            new Separator('── Selection ──'),
            { name: 'Select active container', value: 'use' },
            { name: 'Clear active container selection', value: 'use-clear' },
            new Separator('── Authentication ──'),
            { name: 'Auth setup wizard', value: 'auth-setup' },
            { name: 'Auth status', value: 'auth-status' },
            new Separator('── Configuration ──'),
            { name: 'List settings', value: 'config-list' },
            { name: 'Get a setting', value: 'config-get' },
            { name: 'Set a setting', value: 'config-set' },
            { name: 'Reset settings', value: 'config-reset' },
            new Separator('──'),
            { name: 'Show help', value: '__help__' },
            { name: 'Exit', value: '__exit__' },
        ],
    }, { signal: s }));

    switch (choice) {
        case '__exit__':
            process.exit(0);
            return null; // unreachable in production; needed when process.exit is mocked in tests
        case '__help__':
            program.help();
            return null; // program.help() calls process.exit; needed when mocked
        case 'start':        return ['start'];
        case 'stop':         return ['stop'];
        case 'start-all':    return ['start-all'];
        case 'stop-all':     return ['stop-all'];
        case 'remove':       return ['remove'];
        case 'attach':       return ['attach'];
        case 'shell':        return ['shell'];
        case 'ls':           return ['ls'];
        case 'history':      return ['history'];
        case 'use':          return ['use'];
        case 'use-clear':    return ['use', '--clear'];
        case 'auth-setup':   return ['auth', 'setup'];
        case 'auth-status':  return ['auth', 'status'];
        case 'config-list':  return ['config', 'list'];
        case 'config-get':   return promptConfigGet();
        case 'config-set':   return promptConfigSet();
        case 'config-reset': return promptConfigReset();
        default:             return [];
    }
}

/**
 * Run a command via parseAsync, intercepting process.exit(non-zero) so a
 * single command failure cannot terminate the interactive session.
 * process.exit(0) is still allowed (e.g. --help inside a subcommand).
 */
async function parseAsyncInteractive(program: Command, argv: string[]): Promise<void> {
    const origExit = process.exit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).exit = (code?: number | string) => {
        const n = code === undefined ? 0 : typeof code === 'number' ? code : parseInt(String(code), 10);
        if (n === 0) origExit(0 as never); // clean exit — let it through
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process as any).exit = origExit; // restore before throwing
        const err = new Error(`Command exited with code ${n}`);
        err.name = 'CommandExitError';
        throw err;
    };
    try {
        await program.parseAsync(argv, { from: 'user' });
    } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process as any).exit = origExit;
    }
}

async function pressAnyKey(): Promise<void> {
    if (typeof process.stdin.setRawMode !== 'function') return;
    process.stdout.write(chalk.gray('\n  Press any key to return to the menu...'));
    await new Promise<void>((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (data: Buffer) => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            if (data[0] === 3) { // Ctrl+C
                process.stdout.write('\n');
                process.exit(0);
            }
            resolve();
        });
    });
    process.stdout.write('\n');
}

export async function runInteractiveMode(program: Command, globalOpts: GlobalOpts): Promise<void> {
    if (!process.stdin.isTTY) {
        program.help();
        return;
    }

    while (true) {
        logger.blank();
        console.log(chalk.bold('  Claude Code Sandbox — Interactive Mode'));
        logger.line();

        try {
            const commandArgs = await promptMainMenu(program);
            if (commandArgs === null) break;
            const fullArgv = [...buildGlobalFlags(globalOpts), ...commandArgs];
            await parseAsyncInteractive(program, fullArgv);
            await pressAnyKey();
        } catch (err) {
            const name = (err as Error).name;
            if (name === 'ExitPromptError') {
                logger.blank();
                process.exit(0);
                return; // unreachable in production; needed when process.exit is mocked in tests
            }
            if (name === 'BackError') {
                continue; // ESC pressed — redisplay the menu
            }
            // CommandExitError (process.exit called by a command) or any unexpected throw:
            // The command has already printed its error. For truly unexpected errors,
            // also print the message so the user isn't left with a blank screen.
            if (name !== 'CommandExitError' && name !== 'CommanderError') {
                logger.error((err as Error).message || String(err));
            }
            await pressAnyKey();
        }
    }
}
