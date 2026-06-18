const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: process.env.PROJECT_ID,
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/commands.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 6000,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    env: {
      adminUser:    "admin",
      adminPass:    "admin123",
      testUser:     "testuser",
      testPass:     "test1234",
      viewerUser:   "viewer",
      viewerPass:   "view5678",
    },
  },
});
