import { Page } from '@playwright/test';

export class TestHelper {
  static async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async handleUnexpectedPopups(page: Page): Promise<void> {
    // Handle potential cookie banners, modals, etc.
    try {
      const closeButton = page.locator('[data-testid="close"], .close, button:has-text("Close")').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }
    } catch {
      // Ignore if no popup found
    }
  }

  static async captureNetworkLogs(page: Page): Promise<string[]> {
    const logs: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        logs.push(`❌ ${response.status()} ${response.url()}`);
      }
    });
    return logs;
  }

  static extractTestCaseId(testTitle: string): string {
    const match = testTitle.match(/#(\d+)/);
    return match ? match[1] : 'unknown';
  }
}
