import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Server code keeps its own lint config — the app's Power-of-Ten profile does not
// apply here (it is excluded from the app lint zones). This is a lean, strict-ish
// TypeScript profile for the Node relay.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.config.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  },
);
