import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Live API contract tests. These run against a REAL backend (Spring Boot +
 * PostgreSQL in CI, or any running instance locally) using the frontend's actual
 * Zod schemas, proving the frontend contract matches the production API.
 *
 *   LIVE_API_URL=http://localhost:8081 npm run test:live
 *
 * Node environment (real fetch), not jsdom. Excluded from the default unit run.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.live.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // The journey is stateful (register -> book -> cancel); keep it sequential.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
