// client/jest.config.cjs
const path = require('path'); // Import path module

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // <rootDir> will be 'client/'

  transform: {
    // This pattern tells Jest to use babel-jest for all these file types
    // including your test files and source files.
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': [
      'babel-jest',
      { configFile: path.resolve(__dirname, './babel.config.cjs') },
    ],
  },
  moduleFileExtensions: [
    'js',
    'mjs',
    'cjs',
    'jsx',
    'json',
    'node',
    'ts',
    'tsx',
  ], // Add ts, tsx if using

  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Example for Vite path aliases:
    // '^@/(.*)$': '<rootDir>/src/$1',
  },

  // By default, Jest doesn't transform node_modules.
  // If a dependency is pure ESM, you might need to add it to the exception list.
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],

  // Specify the root directory for Jest (where package.json for client is)
  rootDir: '.', // Correct because jest.config.cjs is in client/

  // Test file patterns
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  // Ensure Jest doesn't try to collect coverage from config files or mocks
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/main.jsx',
    '!src/vite-env.d.ts',
    '!src/setupTests.js',
    '!src/constants/**/*',
    '!**/__mocks__/**',
    '!**/*.config.js', // Exclude config files like babel.config.cjs
    '!**/*.config.cjs',
  ],
};
