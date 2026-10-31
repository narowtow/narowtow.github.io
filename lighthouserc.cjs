process.env.CHROME_PATH = require("playwright").chromium.executablePath();
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "http://localhost/",
        "http://localhost/projects/visceral/",
        "http://localhost/projects/skillmap/",
        "http://localhost/resume/",
      ],
      numberOfRuns: 3,
      settings: {
        preset: undefined,
        formFactor: "mobile",
        chromeFlags: "--headless --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci" },
  },
};
