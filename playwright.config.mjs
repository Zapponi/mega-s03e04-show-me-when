// Local spec only (test/board.spec.mjs against test/fake-api.mjs); live checks live in scripts/verify.mjs.
import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: 'test',
  reporter: 'list',
  retries: 0,
  use: { browserName: 'chromium' },
});
