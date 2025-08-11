import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CategoryPage extends BasePage {
  readonly searchResultsHeading: Locator;
  readonly resultsCount: Locator;
  readonly sortDropdown: Locator;
  readonly listViewRadio: Locator;
  readonly cardViewRadio: Locator;
  readonly productItems: Locator;
  readonly prices: Locator;
  readonly breadcrumbs: Locator;

  constructor(page: Page) {
    super(page);
    this.searchResultsHeading = page.getByRole('heading', { name: 'Search Results' });
    this.resultsCount = page.getByRole('heading', { level: 3 }).filter({ hasText: /Showing \d+ results/ });
    this.sortDropdown = page.getByLabel('Sort order').or(page.getByLabel('Sort order (optional)'));
    this.listViewRadio = page.getByRole('radio', { name: 'Switch to list view' });
    this.cardViewRadio = page.getByRole('radio', { name: 'Switch to card view' });
    this.productItems = page.locator('[data-testid="listing-card"], .listing-item, article').filter({ hasText: /Buy Now|\$/ });
    this.prices = page.locator('text=/\\$[0-9,]+\\.\\d{2}/');
    this.breadcrumbs = page.getByRole('navigation').filter({ hasText: 'Home' }).first();
  }

  async verifyCategoryPage(): Promise<void> {
    await this.waitForElement(this.searchResultsHeading);
    const url = this.page.url();
    if (!url.includes('home-living')) {
      throw new Error(`Expected URL to contain 'home-living', but got: ${url}`);
    }
  }

  async verifySearchResults(): Promise<void> {
    await this.waitForElement(this.resultsCount);
    const countText = await this.resultsCount.textContent();
    if (!countText || !countText.match(/Showing \d+ results/) || countText.includes('0 results')) {
      throw new Error(`Expected results count to show more than 0 items, but got: ${countText}`);
    }
  }

  async ensureListViewActive(): Promise<void> {
    await this.waitForElement(this.listViewRadio);
    const isChecked = await this.listViewRadio.isChecked();
    if (!isChecked) {
      await this.clickWithRetry(this.listViewRadio);
      await this.page.waitForTimeout(1000); // Wait for view to update
    }
  }

  async selectLowestPriceSort(): Promise<void> {
    await this.waitForElement(this.sortDropdown);
    await this.sortDropdown.click();
    await this.sortDropdown.selectOption('Lowest price');
    await this.page.waitForTimeout(2000); // Wait for results to reload
  }

  async verifyPriceSorting(): Promise<void> {
    // Wait for page to update after sorting
    await this.page.waitForLoadState('networkidle');
    
    // Verify URL contains sort parameter
    const url = this.page.url();
    if (!url.includes('sort_order=priceasc')) {
      throw new Error(`Expected URL to contain 'sort_order=priceasc', but got: ${url}`);
    }

    // Extract and verify prices are in ascending order
    await this.waitForElement(this.prices.first());
    const priceElements = await this.prices.all();
    
    if (priceElements.length === 0) {
      throw new Error('No prices found on the page');
    }

    const prices: number[] = [];
    for (const element of priceElements) {
      const priceText = await element.textContent();
      if (priceText) {
        const price = parseFloat(priceText.replace(/[$,]/g, ''));
        if (!isNaN(price)) {
          prices.push(price);
        }
      }
    }

    // Verify prices are in ascending order
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) {
        throw new Error(`Prices are not sorted in ascending order. Found ${prices[i]} after ${prices[i - 1]}`);
      }
    }

    console.log(`✅ Price sorting verified: ${prices.join(', ')}`);
  }

  async takeCategoryScreenshot(): Promise<void> {
    await this.takeScreenshot('category-page-sorted');
  }
}
