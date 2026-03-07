import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackError, withEscBack } from './prompt-utils.js';

// ─── BackError ────────────────────────────────────────────────────────────────

describe('BackError', () => {
    it('has name BackError', () => {
        expect(new BackError().name).toBe('BackError');
    });
});

// ─── withEscBack ──────────────────────────────────────────────────────────────

describe('withEscBack', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the resolved value when the prompt succeeds', async () => {
        const result = await withEscBack(() => Promise.resolve('hello'));
        expect(result).toBe('hello');
    });

    it('rethrows non-abort errors unchanged', async () => {
        const original = new Error('boom');
        await expect(withEscBack(() => Promise.reject(original))).rejects.toBe(original);
    });

    it('converts AbortPromptError to BackError', async () => {
        const err = Object.assign(new Error(), { name: 'AbortPromptError' });
        await expect(withEscBack(() => Promise.reject(err))).rejects.toMatchObject({ name: 'BackError' });
    });

    it('converts CancelPromptError to BackError', async () => {
        const err = Object.assign(new Error(), { name: 'CancelPromptError' });
        await expect(withEscBack(() => Promise.reject(err))).rejects.toMatchObject({ name: 'BackError' });
    });

    it('removes the keypress listener after resolution', async () => {
        const removeSpy = vi.spyOn(process.stdin, 'removeListener');
        await withEscBack(() => Promise.resolve('ok'));
        expect(removeSpy).toHaveBeenCalledWith('keypress', expect.any(Function));
    });

    it('removes the keypress listener even when the prompt throws', async () => {
        const removeSpy = vi.spyOn(process.stdin, 'removeListener');
        const err = new Error('oops');
        await expect(withEscBack(() => Promise.reject(err))).rejects.toThrow('oops');
        expect(removeSpy).toHaveBeenCalledWith('keypress', expect.any(Function));
    });
});
