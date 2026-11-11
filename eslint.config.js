export default [
  { ignores: ['node_modules/', 'dist/', 'out/', 'oracle/java-src/', 'oracle/tools/', 'oracle/harness/build/', 'tests/golden/'] },
  { files: ['**/*.{js,mjs}'], languageOptions: { ecmaVersion: 2025, sourceType: 'module', globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } } },
];
