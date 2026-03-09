import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { appLogger } from './app-logger.js';

export const logger = {
    info: (msg: string) => {
        console.log(chalk.cyan('ℹ'), msg);
        appLogger.info(msg);
    },
    success: (msg: string) => {
        console.log(chalk.green('✓'), msg);
        appLogger.info(msg);
    },
    warn: (msg: string) => {
        console.log(chalk.yellow('⚠'), msg);
        appLogger.warn(msg);
    },
    error: (msg: string) => {
        console.error(chalk.red('✗'), msg);
        appLogger.error(msg);
    },
    line: () => console.log(chalk.gray('─'.repeat(50))),
    blank: () => console.log(),
};

export function spinner(text: string): Ora {
    return ora({ text, color: 'cyan' });
}
