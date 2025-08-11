import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MarketplacePage extends BasePage {
  readonly homeLivingLink: Locator;
  readonly pageHeading: Locator;
  readonly categoryLinks: Locator;
  readonly searchForm: Locator;

  constructor(page: Page) {
    super(page);
    this.homeLivingLink = page.getByRole('link', { name: 'Home & living', exact: true });
    this.pageHeading = page.getByRole('heading', { name: 'Shop new and used items' });
    this.categoryLinks = page.getByRole('navigation', { name: 'Browse Categories' });
    this.searchForm = page.locator('form').filter({ hasText: 'Search Marketplace' });
  }

  async verifyMarketplacePage(): Promise<void> {
    await this.waitForElement(this.pageHeading);
    const url = this.page.url();
    if (!url.includes('marketplace')) {
      throw new Error(`Expected URL to contain 'marketplace', but got: ${url}`);
    }
  }

  async clickHomeLiving(): Promise<void> {
    await this.waitForElement(this.homeLivingLink);
    await this.clickWithRetry(this.homeLivingLink);
  }

  async takeMarketplaceScreenshot(): Promise<void> {
    await this.takeScreenshot('marketplace-page');
  }
}
