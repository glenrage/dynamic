import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginJest from 'eslint-plugin-jest';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.env*'] },

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Configuration for Jest test files
  {
    files: [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
      'src/setupTests.{js,ts}',
    ],
    plugins: {
      jest: pluginJest,
    },
    languageOptions: {
      globals: {
        ...globals.jest, // All Jest globals (describe, it, expect, etc.)
        ...globals.node, // For CJS modules or Node-specific things in tests if any
      },
      parserOptions: {
        // Test files can also be modules
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...pluginJest.configs.recommended.rules,
    },
  },

  // Configuration for Node.js environment files (like .config.js, .cjs)
  {
    files: ['*.config.{js,cjs}', 'vite.config.{js,cjs}', '*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node, // Node.js globals like module, require, process
      },
      parserOptions: {
        sourceType: 'commonjs', // Most config files are CommonJS
        ecmaVersion: 'latest',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
