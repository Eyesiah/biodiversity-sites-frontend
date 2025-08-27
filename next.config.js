const { execSync } = require('child_process');
const packageJson = require('./package.json');

// Get the latest git commit hash
const gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Make the version and commit hash available to the client-side code
  env: {
    APP_VERSION: packageJson.version,
    GIT_COMMIT_HASH: gitCommitHash,
  },
};

module.exports = nextConfig;
