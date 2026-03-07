import { emitKeypressEvents } from 'readline';

/**
 * Thrown when the user presses ESC to cancel a prompt.
 * - In interactive mode (runInteractiveMode): caught by the main loop, menu is redisplayed.
 * - In direct command mode: caught by the top-level error handler in cli.ts (silent exit 0).
 */
export class BackError extends Error {
    override name = 'BackError';
}

/**
 * Wrap an @inquirer/prompts call with ESC-to-back support.
 * Pass the provided AbortSignal as the prompt's context `signal`.
 *
 * Usage:
 *   const answer = await withEscBack(s => select({ message: '...' }, { signal: s }));
 */
export async function withEscBack<T>(
    promptFn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    emitKeypressEvents(process.stdin);
    const ac = new AbortController();

    const onKeypress = (_str: string | undefined, key: { name?: string } | undefined) => {
        if (key?.name === 'escape') ac.abort();
    };

    process.stdin.on('keypress', onKeypress);

    try {
        return await promptFn(ac.signal);
    } catch (err) {
        const name = (err as Error).name;
        if (name === 'AbortPromptError' || name === 'CancelPromptError') {
            throw new BackError();
        }
        throw err;
    } finally {
        process.stdin.removeListener('keypress', onKeypress);
    }
}
