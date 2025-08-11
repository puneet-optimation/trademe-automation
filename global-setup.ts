import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Starting global test setup...');
  
  // Pre-warm the browser and verify site accessibility
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Verifying TradeMe sandbox accessibility...');
    await page.goto('https://www.tmsandbox.co.nz', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ TradeMe sandbox is accessible');
    
    // Check for any maintenance messages or captchas
    const maintenanceMessage = await page.locator('text=/maintenance|temporarily unavailable/i').first();
    if (await maintenanceMessage.isVisible()) {
      console.log('⚠️ Site appears to be in maintenance mode');
    }
    
  } catch (error) {
    console.log('⚠️ Site accessibility check failed:', error.message);
    console.log('🔄 Tests will proceed with individual error handling');
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;
