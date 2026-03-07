'use strict';

module.exports = {
    '**/*.ts': ['eslint --fix', 'prettier --write'],
    '**/*.js': ['eslint --fix', 'prettier --write'],
    '**/*.{json,md}': ['prettier --write'],
};
