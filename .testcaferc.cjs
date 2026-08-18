/** TestCafe configuration — Phase 5 E2E smoke. */
const config = {
  baseUrl: "http://localhost:3000",
  screenshots: {
    path: "tests/e2e/screenshots",
    takeOnFails: true,
  },
  quarantineMode: true,
  selectorTimeout: 10000,
  assertionTimeout: 10000,
};

module.exports = config;
