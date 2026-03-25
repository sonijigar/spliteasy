/**
 * Global Jest setup for mobile tests.
 */

// Make jest globals available
global.jest = jest;

// Silence console.error for expected warnings in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress React act() warnings and similar noise
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
      args[0].includes('act('))
  ) {
    return;
  }
  originalConsoleError(...args);
};
