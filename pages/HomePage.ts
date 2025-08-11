import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly marketplaceLink: Locator;
  readonly pageTitle: Locator;
  readonly searchBox: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    super(page);
    this.marketplaceLink = page.getByRole('link', { name: 'Marketplace' });
    this.pageTitle = page.locator('title');
    this.searchBox = page.getByRole('searchbox', { name: 'Search all of Trade Me' });
    this.logo = page.getByRole('link', { name: 'Trade Me' }).first();
  }

  async navigateToHomePage(): Promise<void> {
    await this.navigateTo('/');
    await this.waitForElement(this.logo);
  }

  async verifyPageTitle(): Promise<void> {
    const title = await this.page.title();
    if (!title.includes('Trade Me')) {
      throw new Error(`Expected page title to contain 'Trade Me', but got: ${title}`);
    }
  }

  async clickMarketplace(): Promise<void> {
    await this.waitForElement(this.marketplaceLink);
    await this.clickWithRetry(this.marketplaceLink);
  }

  async takeHomePageScreenshot(): Promise<void> {
    await this.takeScreenshot('homepage');
  }
}
