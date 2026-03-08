import { DEFAULT_NODE_VERSION, DEFAULT_PYTHON_VERSION } from '@claude-code-sandbox/shared';
import { homedir } from 'os';
import { join } from 'path';

export { DEFAULT_NODE_VERSION, DEFAULT_PYTHON_VERSION };

// Environment variable names
export const ENV_VARS = {
    CONFIG_DIR: 'CLAUDE_SANDBOX_CONFIG_DIR',
    WORKSPACE: 'CLAUDE_SANDBOX_WORKSPACE',
    IMAGE: 'CLAUDE_SANDBOX_IMAGE',
    TAG: 'CLAUDE_SANDBOX_TAG',
} as const;

// Built-in defaults
export const DEFAULT_CONFIG_DIR = join(homedir(), '.claude-code-sandbox');
export const DEFAULT_IMAGE = 'spiriyu/claude-code-sandbox';
export const DEFAULT_IMAGE_TAG = 'latest';

// Docker container naming
export const CONTAINER_NAME_PREFIX = 'claude-code-sandbox-';

// Mount paths inside the container
export const WORKSPACE_MOUNT_PATH = '/workspace';
export const CLAUDE_DIR_CONTAINER_PATH = '/home/dev/.claude';

// Git identity env vars passed into the container
export const GIT_ENV_VARS = {
    USER_NAME: 'GIT_USER_NAME',
    USER_EMAIL: 'GIT_USER_EMAIL',
} as const;

// Auth
export const AUTH_METHODS = {
    API_KEY: 'api_key',
    OAUTH_TOKEN: 'oauth_token',
} as const;

export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];

export const TOKEN_PREFIXES = {
    api_key: 'sk-ant-api03-',
    oauth_token: 'sk-ant-oat01-',
} as const;
