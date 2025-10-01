const fs = require('fs');
const path = require('path');

// always clear any dev cache that exists on startup
const cacheDir = path.join(__dirname, 'dev-api-cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('Cleared development API cache.');
}

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
  async redirects() {
    return [
      {
        source: '/',
        destination: process.env.LANDING_PAGE || '/sites',
        permanent: true,
      },
    ]
  },
};

module.exports = nextConfig;