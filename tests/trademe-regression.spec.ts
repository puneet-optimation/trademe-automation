import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { MarketplacePage } from '../pages/MarketplacePage';
import { CategoryPage } from '../pages/CategoryPage';
import { TestHelper } from '../utils/TestHelper';

test.describe('TradeMe Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up network monitoring
    await TestHelper.captureNetworkLogs(page);
    
    // Handle any unexpected popups
    await TestHelper.handleUnexpectedPopups(page);
  });

  test('Test Case #78959: Category Navigation and Price Sorting', async ({ page }) => {
    const testCaseId = TestHelper.extractTestCaseId('Test Case #78959');
    console.log(`🧪 Executing Test Case ID: ${testCaseId}`);

    // Initialize page objects
    const homePage = new HomePage(page);
    const marketplacePage = new MarketplacePage(page);
    const categoryPage = new CategoryPage(page);

    try {
      // Step 1: Navigate to Trade Me Sandbox home page
      console.log('📍 Step 1: Navigate to Trade Me Sandbox home page');
      await homePage.navigateToHomePage();
      await homePage.verifyPageTitle();
      await homePage.takeHomePageScreenshot();
      console.log('✅ Step 1 completed: Page loads successfully');

      // Step 2: Click on "Marketplace" link
      console.log('📍 Step 2: Click on "Marketplace" link in the navigation');
      await homePage.clickMarketplace();
      await marketplacePage.verifyMarketplacePage();
      await marketplacePage.takeMarketplaceScreenshot();
      console.log('✅ Step 2 completed: Navigation to marketplace page verified');

      // Step 3: Click on "Home & living" category link
      console.log('📍 Step 3: Click on "Home & living" category link');
      await marketplacePage.clickHomeLiving();
      await categoryPage.verifyCategoryPage();
      console.log('✅ Step 3 completed: Navigation to Home & Living category verified');

      // Step 4: Verify search results are displayed
      console.log('📍 Step 4: Verify search results are displayed');
      await categoryPage.verifySearchResults();
      console.log('✅ Step 4 completed: Search results verified with items > 0');

      // Step 5: Ensure List view is active
      console.log('📍 Step 5: Ensure List view is active');
      await categoryPage.ensureListViewActive();
      console.log('✅ Step 5 completed: List view is active and functional');

      // Step 6: Select "Lowest price" from the Sort dropdown
      console.log('📍 Step 6: Select "Lowest price" from the Sort dropdown');
      await categoryPage.selectLowestPriceSort();
      console.log('✅ Step 6 completed: Lowest price sort selected');

      // Step 7: Extract and verify price sorting
      console.log('📍 Step 7: Extract and verify price sorting');
      await categoryPage.verifyPriceSorting();
      await categoryPage.takeCategoryScreenshot();
      console.log('✅ Step 7 completed: Price sorting functionality verified');

      console.log('🎉 Test Case #78959 completed successfully!');

    } catch (error) {
      console.error(`❌ Test Case #78959 failed at step: ${error.message}`);
      
      // Take failure screenshot
      await page.screenshot({ 
        path: `test-results/failure-${testCaseId}-${Date.now()}.png`,
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('Test Case #78959: Price Sorting Validation (Data-Driven)', async ({ page }) => {
    const testData = [
      { sortOption: 'Lowest price', urlParam: 'priceasc', expectedOrder: 'ascending' },
      { sortOption: 'Highest price', urlParam: 'pricedesc', expectedOrder: 'descending' }
    ];

    const categoryPage = new CategoryPage(page);
    
    // Navigate to category page first
    await page.goto('/a/marketplace/home-living');
    await categoryPage.verifyCategoryPage();

    for (const data of testData) {
      console.log(`🧪 Testing sort option: ${data.sortOption}`);
      
      // Select sort option
      await categoryPage.sortDropdown.selectOption(data.sortOption);
      await TestHelper.waitForNetworkIdle(page);
      
      // Verify URL parameter
      expect(page.url()).toContain(`sort_order=${data.urlParam}`);
      
      // Verify sorting order
      const prices = await categoryPage.prices.allTextContents();
      const numericPrices = prices
        .map(price => parseFloat(price.replace(/[$,]/g, '')))
        .filter(price => !isNaN(price));
      
      if (data.expectedOrder === 'ascending') {
        for (let i = 1; i < numericPrices.length; i++) {
          expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i - 1]);
        }
      } else {
        for (let i = 1; i < numericPrices.length; i++) {
          expect(numericPrices[i]).toBeLessThanOrEqual(numericPrices[i - 1]);
        }
      }
      
      console.log(`✅ ${data.sortOption} sorting verified`);
    }
  });
});
