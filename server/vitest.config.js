const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    include: ["services/**/*.test.js", "validation/**/*.test.js"],
    coverage: {
      // "lcov" writes coverage/lcov.info, which the CI workflow
      // uploads to Codecov alongside coverage-node/lcov.info (c8).
      reporter: ["text", "html", "clover", "json", "lcov"],
    },
  },
});

