import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

/** Returns an error message string, or null if valid. */

export function validateWorkspace(p: string): string | null {
    const abs = resolve(p);
    if (!existsSync(abs)) return `Directory not found: ${abs}`;
    if (!statSync(abs).isDirectory()) return `Not a directory: ${abs}`;
    return null;
}

export function validateImageName(name: string): string | null {
    if (!name) return 'Image name cannot be empty';
    if (name.length > 256) return 'Image name too long (max 256 chars)';
    // Allow lowercase letters, digits, dots, hyphens, slashes, colons (for registry URLs)
    if (!/^[a-z0-9._\-/:]+$/.test(name)) return `Invalid image name: "${name}"`;
    return null;
}

export function validateTag(tag: string): string | null {
    if (!tag) return 'Tag cannot be empty';
    if (tag.length > 128) return 'Tag too long (max 128 chars)';
    if (!/^[a-zA-Z0-9._\-]+$/.test(tag)) return `Invalid tag: "${tag}"`;
    return null;
}

export function validateToken(token: string, prefix: string): string | null {
    if (!token) return 'Token cannot be empty';
    if (!token.startsWith(prefix)) return `Token should start with "${prefix}"`;
    return null;
}
