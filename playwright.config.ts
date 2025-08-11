import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for more stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // Increased retries for CI reliability
  workers: 1, // Single worker to avoid resource conflicts
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000, // 30s for assertions
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'] // Console output for CI
  ],
  use: {
    baseURL: 'https://www.tmsandbox.co.nz',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // Increased for slow sandbox
    navigationTimeout: 45000, // Increased for slow page loads
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Add user agent to avoid bot detection
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-web-security', // For sandbox environment
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling', // Prevent timeouts
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    }
  ],
  expect: {
    toHaveScreenshot: {
      mode: 'ci',
      threshold: 0.4, // More lenient threshold for visual differences
      maxDiffPixels: 1000, // Allow some pixel differences
      animations: 'disabled', // Disable animations for consistent screenshots
    },
  },
  // Global setup for better test stability
  globalSetup: require.resolve('./global-setup.ts'),
});
