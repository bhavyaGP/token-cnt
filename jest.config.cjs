module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ["server/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js", "<rootDir>/tests/**/*.spec.js"],
};
    