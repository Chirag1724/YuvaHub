import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // Deterministic environment for the E2E suite. The app boots against a
    // throwaway Firebase project, and the backend runs with mock auth enabled
    // so authenticated flows (auth/sync, bookmarks, community) work without a
    // real Firebase project, MongoDB, or secrets — both locally and in CI.
    // dotenv does not override vars already present in the process env, so the
    // values below take precedence over any committed .env.
    env: {
      ...process.env,
      PORT: '5173',
      NODE_ENV: 'development',
      SKIP_ENV_VALIDATION: 'true',
      ENABLE_MOCK_AUTH: 'true',
      MOCK_VALID_TOKEN: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJtb2NrX3VzZXJfMTIzIiwiZW1haWwiOiJtb2NrQGV4YW1wbGUuY29tIiwibmFtZSI6Ik1vY2sgVXNlciIsInVzZXJfaWQiOiJtb2NrX3VzZXJfMTIzIiwicGljdHVyZSI6IiJ9.mock-signature',
      VITE_FIREBASE_API_KEY: 'AIzaSyTest123456789abcdefghijklmnopqrstuvwxyz',
      VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      VITE_FIREBASE_APP_ID: '1:123456789:web:abc123def456',
      VITE_ADMIN_EMAILS: 'mock@example.com',
    },
  },
});
