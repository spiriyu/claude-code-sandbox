import { resolve } from 'path';
import { ENV_VARS } from './constants.js';

/** Resolves workspace: flag → CLAUDE_SANDBOX_WORKSPACE env → cwd. Always returns absolute path. */
export function resolveWorkspace(flag?: string): string {
    return resolve(flag ?? process.env[ENV_VARS.WORKSPACE] ?? process.cwd());
}
