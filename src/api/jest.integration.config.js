module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/integration/**/*.test.js'],
    setupFilesAfterEnv: ['./src/tests/integration/setup.js'],
    testTimeout: 30000,
    verbose: true
}; 