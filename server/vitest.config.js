const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    include: ["services/**/*.test.js"],
  },
});
