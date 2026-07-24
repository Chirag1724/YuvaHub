import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false, // Run tests sequentially to avoid DB collisions
    include: ['tests/**/*.ts', 'src/**/validationTest.ts'],
    testTimeout: 120000, // Increased timeout for long-running integration tests
  },
});
