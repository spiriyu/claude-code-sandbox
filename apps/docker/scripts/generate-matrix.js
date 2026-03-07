#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// versions.json lives in libs/shared/src — the single source of truth for the monorepo
const versions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'libs', 'shared', 'src', 'versions.json'), 'utf8'));

const releaseVersion = process.env.RELEASE_VERSION;
if (!releaseVersion) {
    console.error('Error: RELEASE_VERSION env var is required');
    process.exit(1);
}

/**
 * Parse a version string into numeric parts.
 * "22.18.0" → [22, 18, 0]
 * "3.13"    → [3, 13]
 */
function parseParts(v) {
    return v.split('.').map(Number);
}

/**
 * Compare two version arrays numerically.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareVersions(a, b) {
    const pa = parseParts(a);
    const pb = parseParts(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/**
 * Compute alias tags for a list of versions.
 *
 * Each version always gets its full string as an alias.
 * Among versions sharing the same major, only the highest gets the major-only alias.
 * Among versions sharing the same major.minor, only the highest gets the major.minor alias.
 */
function computeAliases(versionList) {
    const sorted = [...versionList].sort(compareVersions).reverse();
    const result = {};

    // Track which major and major.minor prefixes have already been assigned
    const majorClaimed = new Set();
    const minorClaimed = new Set();

    for (const ver of sorted) {
        const parts = parseParts(ver);
        const aliases = [ver]; // full version is always an alias

        const majorKey = String(parts[0]);
        if (!majorClaimed.has(majorKey)) {
            majorClaimed.add(majorKey);
            aliases.push(majorKey);
        }

        if (parts.length >= 2) {
            const minorKey = `${parts[0]}.${parts[1]}`;
            if (!minorClaimed.has(minorKey)) {
                minorClaimed.add(minorKey);
                // Only add if different from the full version
                if (minorKey !== ver) {
                    aliases.push(minorKey);
                }
            }
        }

        result[ver] = aliases;
    }

    return result;
}

// Compute aliases for each runtime
const nodeAliases = computeAliases(versions.node);
const pythonAliases = computeAliases(versions.python);

// Determine highest versions for the "latest" and bare version tags
const highestNode = [...versions.node].sort(compareVersions).reverse()[0];
const highestPython = [...versions.python].sort(compareVersions).reverse()[0];

// Build the matrix: cartesian product of node × python
const include = [];

for (const nodeVer of versions.node) {
    for (const pythonVer of versions.python) {
        const nAliases = nodeAliases[nodeVer];
        const pAliases = pythonAliases[pythonVer];

        // Cartesian product of node aliases × python aliases, prefixed with release version
        const tags = [];
        for (const na of nAliases) {
            for (const pa of pAliases) {
                tags.push(`${releaseVersion}_node${na}_python${pa}`);
            }
        }

        // Highest node + highest python combo gets "latest" and bare version
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

const matrix = { include };
console.log(JSON.stringify(matrix));
