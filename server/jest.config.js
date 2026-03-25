/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/src/__tests__/helpers/env.js'],

  // Collect coverage from all source files so you can see the full picture.
  // Routes and app.js show 0% because integration tests currently run against
  // the in-memory mock server (no DB download required).  Coverage for those
  // files will grow as functional tests against the real server are added.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',       // entry point — wires app + DB, not unit-testable
    '!src/__tests__/**',
  ],

  // Thresholds are enforced only on the files we directly test today
  // (middleware + User model).  Raise these numbers as coverage expands.
  coverageThreshold: {
    'src/middleware/auth.js': { lines: 95, functions: 95, branches: 95, statements: 95 },
    'src/models/User.js':     { lines: 95, functions: 95, branches: 95, statements: 95 },
  },

  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
};
