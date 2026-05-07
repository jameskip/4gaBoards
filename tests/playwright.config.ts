import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // API-cleans stale `E2E*` projects before each run so the dashboard never bloats.
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Local: 1 — the Sails dev server is single-threaded; concurrent contexts cause spinner-stalls.
  // CI: 50% — production hardware parallelizes fine.
  workers: isCI ? '50%' : 1,
  // CI: `list` for per-test names live in Actions logs, `html` for post-run drill-down,
  // `github` for inline PR annotations on failure. (See workflow: FORCE_COLOR=1 keeps ✓/✘
  // colored in the Actions UI.)
  // Local: `list` (per-test detail) + `html` opening only when something fails.
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'on-failure' }]],
  timeout: 30_000,
  // 10s headroom for assertion auto-retry; skill recommends 5–10s.
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },

  projects: [
    // Setup project runs `auth.setup.ts` first, captures storageState to playwright/.auth/user.json.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Authenticated tests reuse the saved storageState — no UI login per test.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      // The login-flow tests need empty storage state, so they run in the `auth` project below.
      testIgnore: /auth\.spec\.ts/,
    },
    // Login-flow tests opt out of shared auth so they exercise the real unauthenticated → authenticated transition.
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
