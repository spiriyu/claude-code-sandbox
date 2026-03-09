import { randomBytes } from 'crypto';

export type SessionMode = 'interactive' | 'command';

export interface SessionState {
    sessionId: string | null;
    mode: SessionMode | null;
    startedAt: Date | null;
    workspace: string | null;
    configDir: string | null;
    currentContainerId: string | null;
}

const store: SessionState = {
    sessionId: null,
    mode: null,
    startedAt: null,
    workspace: null,
    configDir: null,
    currentContainerId: null,
};

export interface InitOptions {
    workspace?: string;
    configDir?: string;
}

export function initSession(mode: SessionMode, opts: InitOptions = {}): void {
    store.sessionId = randomBytes(4).toString('hex'); // e.g. "a3b4c5d6"
    store.mode = mode;
    store.startedAt = new Date();
    store.workspace = opts.workspace ?? null;
    store.configDir = opts.configDir ?? null;
    store.currentContainerId = null;
}

export function setSessionContainerId(id: string | null): void {
    store.currentContainerId = id;
}

export function getSession(): Readonly<SessionState> {
    return store;
}
