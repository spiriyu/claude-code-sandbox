import versionsData from './versions.json' with { type: 'json' };

export const versions = versionsData as { node: string[]; python: string[] };

/**
 * The default Node.js major version (highest in the versions list).
 * Derived from versions.json so CLI defaults stay in sync with the Docker image matrix.
 */
export const DEFAULT_NODE_VERSION: string = versions.node[0].split('.')[0];

/**
 * The default Python version (highest in the versions list).
 * Derived from versions.json so CLI defaults stay in sync with the Docker image matrix.
 */
export const DEFAULT_PYTHON_VERSION: string = versions.python[0];

export interface MatrixEntry {
    node_version: string;
    python_version: string;
    tags: string;
}

function parseParts(v: string): number[] {
    return v.split('.').map(Number);
}

function compareVersions(a: string, b: string): number {
    const pa = parseParts(a);
    const pb = parseParts(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function computeAliases(versionList: string[]): Record<string, string[]> {
    const sorted = [...versionList].sort(compareVersions).reverse();
    const result: Record<string, string[]> = {};
    const majorClaimed = new Set<string>();
    const minorClaimed = new Set<string>();

    for (const ver of sorted) {
        const parts = parseParts(ver);
        const aliases: string[] = [ver];

        const majorKey = String(parts[0]);
        if (!majorClaimed.has(majorKey)) {
            majorClaimed.add(majorKey);
            aliases.push(majorKey);
        }

        if (parts.length >= 2) {
            const minorKey = `${parts[0]}.${parts[1]}`;
            if (!minorClaimed.has(minorKey)) {
                minorClaimed.add(minorKey);
                if (minorKey !== ver) {
                    aliases.push(minorKey);
                }
            }
        }

        result[ver] = aliases;
    }

    return result;
}

/**
 * Generate the GitHub Actions build matrix from versions.json.
 * Produces a cartesian product of node × python versions with alias tags.
 */
export function generateMatrix(releaseVersion: string): { include: MatrixEntry[] } {
    const nodeAliases = computeAliases(versions.node);
    const pythonAliases = computeAliases(versions.python);

    const highestNode = [...versions.node].sort(compareVersions).reverse()[0];
    const highestPython = [...versions.python].sort(compareVersions).reverse()[0];

    const include: MatrixEntry[] = [];

    for (const nodeVer of versions.node) {
        for (const pythonVer of versions.python) {
            const nAliases = nodeAliases[nodeVer];
            const pAliases = pythonAliases[pythonVer];

            const tags: string[] = [];
            for (const na of nAliases) {
                for (const pa of pAliases) {
                    tags.push(`${releaseVersion}_node${na}_python${pa}`);
                }
            }

            const isDefault = nodeVer === highestNode && pythonVer === highestPython;
            if (isDefault) {
                tags.push('latest', releaseVersion);
            }

            include.push({
                node_version: nodeVer,
                python_version: pythonVer,
                tags: tags.join(','),
            });
        }
    }

    return { include };
}
