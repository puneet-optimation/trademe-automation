import { Page, expect } from '@playwright/test';

export class TestHelper {
  private static retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff

  /**
   * Enhanced retry mechanism with exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>, 
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          console.error(`❌ ${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`);
          throw lastError;
        }
        
        const delay = this.retryDelays[attempt] || 8000;
        console.log(`⚠️ ${operationName} failed on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await this.wait(delay);
      }
    }
    
    throw lastError || new Error(`${operationName} failed after retries`);
  }

  /**
   * Advanced network idle waiting
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.log('⚠️ Network idle timeout, continuing with domcontentloaded');
      await page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 15000) });
    }
  }

  /**
   * Enhanced popup handling with multiple strategies
   */
  static async handleUnexpectedPopups(page: Page): Promise<void> {
    const popupSelectors = [
      // Cookie banners
      '[data-testid="cookie-banner"] button, .cookie-banner button, .accept-cookies',
      
      // Modal close buttons
      '[data-testid="close"], .close, button:has-text("Close"), [aria-label="Close"]',
      
      // Common popup patterns
      '.modal-close, .popup-close, .overlay-close',
      '.dismiss, .skip, button:has-text("Skip"), button:has-text("Dismiss")',
      
      // Newsletter/signup popups
      'button:has-text("No thanks"), button:has-text("Maybe later"), .newsletter-close',
      
      // Survey/feedback popups
      'button:has-text("Not now"), .survey-close, [data-testid="feedback-close"]'
    ];

    for (const selector of popupSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click({ timeout: 3000 });
          await page.waitForTimeout(500); // Allow popup to close
          console.log(`✅ Closed popup using selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Handle overlay/backdrop clicks as fallback
    try {
      const overlay = page.locator('.overlay, .backdrop, .modal-backdrop').first();
      if (await overlay.isVisible({ timeout: 1000 })) {
        await overlay.click({ position: { x: 10, y: 10 } });
        console.log('✅ Closed popup by clicking overlay');
      }
    } catch (error) {
      // No overlay found or clickable
    }
  }

  /**
   * Comprehensive network monitoring and logging
   */
  static async captureNetworkLogs(page: Page): Promise<string[]> {
    const logs: string[] = [];
    const errorCounts = new Map<string, number>();

    // Monitor failed requests
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      
      if (status >= 400) {
        const errorKey = `${status}_${new URL(url).hostname}`;
        const count = errorCounts.get(errorKey) || 0;
        errorCounts.set(errorKey, count + 1);
        
        if (count === 0) { // Log unique errors only
          logs.push(`❌ ${status} ${url}`);
          
          // Log critical errors immediately
          if (status >= 500) {
            console.log(`🚨 Server error detected: ${status} ${url}`);
          }
        }
      }
    });

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`🔴 Console Error: ${msg.text()}`);
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      logs.push(`💥 Page Error: ${error.message}`);
    });

    return logs;
  }

  /**
   * Advanced page stability verification
   */
  static async waitForPageStability(page: Page, stabilityDuration: number = 2000): Promise<void> {
    console.log('🔍 Waiting for page stability...');
    
    // Wait for multiple stability indicators
    await Promise.all([
      // DOM stability
      page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               !document.querySelector('.loading, .spinner, .skeleton');
      }, { timeout: 15000 }),
      
      // Network stability
      this.waitForNetworkIdle(page, 10000),
      
      // Visual stability (no layout shifts)
      page.waitForFunction(() => {
        return new Promise(resolve => {
          let layoutShiftCount = 0;
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(() => {
              layoutShiftCount++;
            });
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(layoutShiftCount < 3); // Allow minor shifts
          }, 1000);
        });
      }, { timeout: 10000 }).catch(() => {
        // Fallback if layout-shift API not available
        return true;
      })
    ]);

    // Additional stability wait
    await page.waitForTimeout(stabilityDuration);
    console.log('✅ Page stability verified');
  }

  /**
   * Enhanced test environment setup
   */
  static async setupTestEnvironment(page: Page): Promise<void> {
    // Set up enhanced error handling
    await page.addInitScript(() => {
      // Prevent unhandled promise rejections from failing tests
      window.addEventListener('unhandledrejection', event => {
        console.warn('Unhandled promise rejection:', event.reason);
        event.preventDefault();
      });

      // Override console.error to capture but not fail on JS errors
      const originalError = console.error;
      console.error = (...args) => {
        // Log but don't break test execution
        originalError.apply(console, args);
      };

      // Disable notifications and geolocation prompts
      if ('Notification' in window) {
        Notification.requestPermission = () => Promise.resolve('denied');
      }
      
      if ('geolocation' in navigator) {
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: () => {},
            watchPosition: () => {},
            clearWatch: () => {}
          }
        });
      }
    });

    // Set up performance monitoring
    await page.route('**/*', (route) => {
      const request = route.request();
      const startTime = Date.now();
      
      route.continue().then(() => {
        const duration = Date.now() - startTime;
        if (duration > 10000) { // Log slow requests
          console.log(`🐌 Slow request: ${request.url()} took ${duration}ms`);
        }
      }).catch(() => {
        // Request failed or was aborted
      });
    });
  }

  /**
   * Intelligent element waiting with multiple strategies
   */
  static async waitForElementSmart(page: Page, selector: string, timeout: number = 15000): Promise<void> {
    const strategies = [
      // Try as regular selector
      () => page.waitForSelector(selector, { timeout: timeout / 3 }),
      
      // Try as text content
      () => page.waitForFunction(
        (sel) => document.querySelector(sel) || 
                 Array.from(document.querySelectorAll('*')).find(el => 
                   el.textContent?.includes(sel)
                 ),
        selector,
        { timeout: timeout / 3 }
      ),
      
      // Try as data-testid
      () => page.waitForSelector(`[data-testid="${selector}"]`, { timeout: timeout / 3 })
    ];

    for (const strategy of strategies) {
      try {
        await strategy();
        return;
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`Element not found with any strategy: ${selector}`);
  }

  /**
   * Enhanced screenshot capture with context
   */
  static async captureTestEvidence(
    page: Page, 
    testCaseId: string, 
    status: 'success' | 'failure', 
    step?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stepSuffix = step ? `-${step}` : '';
    const filename = `test-evidence-${status}-${testCaseId}${stepSuffix}-${timestamp}.png`;
    
    try {
      await page.screenshot({ 
        path: `test-results/${filename}`,
        fullPage: false, // Faster capture
        animations: 'disabled'
      });
      
      console.log(`📸 Test evidence captured: ${filename}`);
    } catch (error) {
      console.log(`⚠️ Could not capture test evidence: ${error.message}`);
    }
  }

  /**
   * Page state logging for debugging
   */
  static async logPageState(page: Page): Promise<void> {
    try {
      const url = page.url();
      const title = await page.title();
      const readyState = await page.evaluate(() => document.readyState);
      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      
      console.log('📊 Page State Debug Info:');
      console.log(`   URL: ${url}`);
      console.log(`   Title: ${title}`);
      console.log(`   Ready State: ${readyState}`);
      console.log(`   Element Count: ${elementCount}`);
      
      // Check for common error indicators
      const hasErrors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .alert-error, [data-testid*="error"]');
        const notFoundElements = document.querySelectorAll(':contains("404"), :contains("Not Found")');
        return {
          errorElements: errorElements.length,
          notFoundElements: notFoundElements.length,
          hasConsoleErrors: !!window.console && window.console.error
        };
      });
      
      if (hasErrors.errorElements > 0) {
        console.log(`   ⚠️ Error elements detected: ${hasErrors.errorElements}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Could not log page state: ${error.message}`);
    }
  }

  /**
   * Extract test case ID from test title
   */
  static extractTestCaseId(testTitle: string): string {
    const match = testTitle.match(/#(\d+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Smart selector finder - tries multiple selector strategies
   */
  static async findElement(page: Page, options: {
    text?: string;
    role?: string;
    testId?: string;
    selector?: string;
    ariaLabel?: string;
  }): Promise<any> {
    const { text, role, testId, selector, ariaLabel } = options;
    
    const strategies = [];
    
    if (testId) {
      strategies.push(() => page.getByTestId(testId));
    }
    
    if (role && text) {
      strategies.push(() => page.getByRole(role as any, { name: text }));
    }
    
    if (text) {
      strategies.push(() => page.getByText(text));
    }
    
    if (ariaLabel) {
      strategies.push(() => page.getByLabel(ariaLabel));
    }
    
    if (selector) {
      strategies.push(() => page.locator(selector));
    }
    
    for (const strategy of strategies) {
      try {
        const element = strategy();
        if (await element.isVisible({ timeout: 3000 })) {
          return element;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`Element not found with any strategy: ${JSON.stringify(options)}`);
  }

  /**
   * Enhanced click with retry and verification
   */
  static async clickElementSafely(page: Page, locator: any, options?: {
    timeout?: number;
    retries?: number;
    waitForNavigation?: boolean;
  }): Promise<void> {
    const { timeout = 10000, retries = 3, waitForNavigation = false } = options || {};
    
    await this.executeWithRetry(async () => {
      // Ensure element is clickable
      await locator.waitFor({ state: 'visible', timeout });
      await locator.waitFor({ state: 'attached', timeout });
      
      // Scroll element into view if needed
      await locator.scrollIntoViewIfNeeded();
      
      // Wait for element to be stable
      await page.waitForTimeout(200);
      
      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ timeout }),
          locator.click({ timeout })
        ]);
      } else {
        await locator.click({ timeout });
      }
      
    }, 'Click element safely', retries);
  }

  /**
   * Verify page loaded correctly
   */
  static async verifyPageLoaded(page: Page, expectedUrlPattern?: string | RegExp): Promise<void> {
    // Basic page load verification
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Verify URL if pattern provided
    if (expectedUrlPattern) {
      const currentUrl = page.url();
      if (typeof expectedUrlPattern === 'string') {
        expect(currentUrl).toContain(expectedUrlPattern);
      } else {
        expect(currentUrl).toMatch(expectedUrlPattern);
      }
    }
    
    // Verify basic page structure
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);
  }

  /**
   * Wait for an array of conditions with timeout
   */
  static async waitForConditions(
    conditions: (() => Promise<boolean>)[], 
    timeout: number = 15000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const results = await Promise.allSettled(conditions.map(condition => condition()));
      
      const allPassed = results.every(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      if (allPassed) {
        return;
      }
      
      await this.wait(500); // Check every 500ms
    }
    
    throw new Error('Not all conditions met within timeout');
  }

  /**
   * Enhanced wait utility
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Performance monitoring and reporting
   */
  static async measurePagePerformance(page: Page): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  }> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime
      };
    });
  }

  /**
   * Memory usage monitoring
   */
  static async checkMemoryUsage(page: Page): Promise<void> {
    try {
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (memoryInfo) {
        const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
        console.log(`💾 Memory usage: ${usedMB}MB`);
        
        if (usedMB > 100) {
          console.log('⚠️ High memory usage detected');
        }
      }
    } catch (error) {
      // Memory API not available in all browsers
    }
  }

  /**
   * Enhanced error context for debugging
   */
  static createErrorContext(error: Error, context: {
    testName?: string;
    step?: string;
    url?: string;
    additionalInfo?: any;
  }): Error {
    const { testName, step, url, additionalInfo } = context;
    
    let message = error.message;
    
    if (testName) message += `\n🧪 Test: ${testName}`;
    if (step) message += `\n📍 Step: ${step}`;
    if (url) message += `\n🔗 URL: ${url}`;
    if (additionalInfo) message += `\n📋 Info: ${JSON.stringify(additionalInfo)}`;
    
    const enhancedError = new Error(message);
    enhancedError.stack = error.stack;
    
    return enhancedError;
  }
}
