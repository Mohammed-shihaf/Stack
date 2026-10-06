'use strict';

const sonarjs = require('eslint-plugin-sonarjs');
const security = require('eslint-plugin-security');

module.exports = [
  {
    files: ['src/**/*.js', 'packages/**/*.js'],
    plugins: { sonarjs, security },
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'no-unused-vars': 'warn',
    },
  },
];
