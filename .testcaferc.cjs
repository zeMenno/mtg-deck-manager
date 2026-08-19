/** TestCafe configuration — Phase 15 E2E. */
const config = {
  baseUrl: "http://localhost:3000",
  screenshots: {
    path: "tests/e2e/screenshots",
    takeOnFails: true,
  },
  quarantineMode: {
    successThreshold: 1,
    attemptLimit: 2,
  },
  selectorTimeout: 15000,
  assertionTimeout: 15000,
  pageLoadTimeout: 30000,
  browserInitTimeout: 180000,
  concurrency: 1,
};

module.exports = config;
