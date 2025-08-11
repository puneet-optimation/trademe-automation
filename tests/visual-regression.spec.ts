import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { MarketplacePage } from '../pages/MarketplacePage';
import { CategoryPage } from '../pages/CategoryPage';

test.describe('Visual Regression Tests', () => {
  test('Homepage Visual Regression', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToHomePage();
    await homePage.takeHomePageScreenshot();
  });

  test('Marketplace Page Visual Regression', async ({ page }) => {
    const marketplacePage = new MarketplacePage(page);
    await page.goto('/a/marketplace');
    await marketplacePage.verifyMarketplacePage();
    await marketplacePage.takeMarketplaceScreenshot();
  });

  test('Category Page Sorting Visual Regression', async ({ page }) => {
    const categoryPage = new CategoryPage(page);
    await page.goto('/a/marketplace/home-living');
    await categoryPage.verifyCategoryPage();
    await categoryPage.selectLowestPriceSort();
    await categoryPage.takeCategoryScreenshot();
  });
});
