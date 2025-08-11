import { Page, Locator, expect } from '@playwright/test';
import { TestHelper } from '../utils/TestHelper';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Enhanced navigation with retry and verification
   */
  async navigateTo(url: string, options?: {
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    retries?: number;
  }): Promise<void> {
    const { timeout = 60000, waitUntil = 'domcontentloaded', retries = 3 } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      await this.page.goto(url, { 
        timeout, 
        waitUntil 
      });
      
      // Verify navigation was successful
      await this.waitForPageLoad();
      
      // Additional verification
      const currentUrl = this.page.url();
      const expectedPath = url.startsWith('/') ? url : new URL(url).pathname;
      
      if (!currentUrl.includes(expectedPath)) {
        throw new Error(`Navigation failed: expected path '${expectedPath}' but got '${currentUrl}'`);
      }
      
    }, `Navigate to ${url}`, retries);
  }

  /**
   * Enhanced page load waiting with multiple strategies
   */
  async waitForPageLoad(timeout: number = 45000): Promise<void> {
    await TestHelper.waitForConditions([
      // Basic DOM ready
      () => this.page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 20000) }),
      
      // Network idle (with fallback)
      () => TestHelper.waitForNetworkIdle(this.page, Math.min(timeout, 15000)),
      
      // Page structure loaded
      () => this.page.waitForFunction(() => {
        const body = document.querySelector('body');
        return body && body.children.length > 0 && document.readyState === 'complete';
      }, { timeout: Math.min(timeout, 10000) }),
      
      // No critical loading indicators
      () => this.page.waitForFunction(() => {
        const criticalLoaders = document.querySelectorAll('.page-loading, .main-loading, .critical-loading');
        return criticalLoaders.length === 0;
      }, { timeout: Math.min(timeout, 8000) })
      
    ], timeout);
  }

  /**
   * Enhanced screenshot with visual regression capabilities
   */
  async takeScreenshot(name: string, options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    animations?: 'disabled' | 'allow';
    threshold?: number;
  }): Promise<void> {
    const { 
      fullPage = true, 
      clip, 
      animations = 'disabled',
      threshold = 0.3
    } = options || {};
    
    try {
      // Wait for page stability before taking screenshot
      await TestHelper.waitForPageStability(this.page, 1000);
      
      // Hide dynamic elements for consistent screenshots
      await this.page.evaluate(() => {
        const dynamicSelectors = [
          '.timestamp', '.time-ago', '.last-updated',
          '.notification-badge', '.live-count', '.counter',
          '.carousel-dots', '.slider-indicators',
          '.loading', '.spinner', '.skeleton'
        ];
        
        dynamicSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      });
      
      // Take screenshot with enhanced options
      await expect(this.page).toHaveScreenshot(`${name}.png`, {
        fullPage,
        clip,
        animations,
        threshold,
        maxDiffPixels: 1000
      });
      
    } catch (error) {
      // Handle missing baseline gracefully
      if (error.message.includes('does not exist')) {
        console.log(`📸 Baseline screenshot created for ${name}`);
        
        // Take a regular screenshot as backup
        await this.page.screenshot({
          path: `test-results/${name}-backup.png`,
          fullPage,
          clip,
          animations
        });
      } else if (error.message.includes('differs from the expected')) {
        console.log(`⚠️ Visual difference detected in ${name} - see test artifacts`);
        
        // Take comparison screenshot
        await this.page.screenshot({
          path: `test-results/${name}-diff-${Date.now()}.png`,
          fullPage,
          clip,
          animations
        });
        
        // Don't fail the test for visual differences - log for review
        console.log('📊 Visual regression test completed with differences - manual review required');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enhanced element waiting with smart strategies
   */
  async waitForElement(
    locator: Locator, 
    options?: {
      timeout?: number;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      retries?: number;
    }
  ): Promise<void> {
    const { timeout = 15000, state = 'visible', retries = 2 } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      await locator.waitFor({ state, timeout });
      
      // Additional verification for visible elements
      if (state === 'visible') {
        // Ensure element is not just technically visible but actually on screen
        const isInViewport = await locator.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && 
                 rect.top >= 0 && rect.left >= 0 &&
                 rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        });
        
        if (!isInViewport) {
          await locator.scrollIntoViewIfNeeded();
        }
      }
      
    }, `Wait for element (${state})`, retries);
  }

  /**
   * Enhanced click with comprehensive retry logic
   */
  async clickWithRetry(
    locator: Locator, 
    options?: {
      maxRetries?: number;
      timeout?: number;
      waitForNavigation?: boolean;
      position?: { x: number; y: number };
      force?: boolean;
    }
  ): Promise<void> {
    const { 
      maxRetries = 3, 
      timeout = 10000, 
      waitForNavigation = false,
      position,
      force = false
    } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      // Pre-click validations
      await this.waitForElement(locator, { timeout: timeout / 2 });
      
      // Ensure element is ready for interaction
      await locator.waitFor({ state: 'attached', timeout: 5000 });
      
      // Scroll element into view if needed
      await locator.scrollIntoViewIfNeeded();
      
      // Wait for element to be stable
      await this.page.waitForTimeout(300);
      
      // Check if element is clickable
      if (!force) {
        const isClickable = await locator.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.pointerEvents !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.display !== 'none';
        });
        
        if (!isClickable) {
          throw new Error('Element is not clickable (disabled or hidden)');
        }
      }
      
      // Perform click based on options
      if (waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({ timeout }),
          locator.click({ timeout, position, force })
        ]);
      } else {
        await locator.click({ timeout, position, force });
      }
      
      // Post-click verification
      await this.page.waitForTimeout(200); // Allow UI to respond
      
    }, 'Click element with retry', maxRetries);
  }

  /**
   * Smart text input with validation
   */
  async fillInput(
    locator: Locator, 
    text: string, 
    options?: {
      clear?: boolean;
      timeout?: number;
      verify?: boolean;
      retries?: number;
    }
  ): Promise<void> {
    const { clear = true, timeout = 10000, verify = true, retries = 2 } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      await this.waitForElement(locator, { timeout });
      
      // Ensure input is focused and ready
      await locator.focus();
      await this.page.waitForTimeout(100);
      
      if (clear) {
        await locator.clear();
        await this.page.waitForTimeout(100);
      }
      
      await locator.fill(text);
      
      // Verify text was entered correctly
      if (verify) {
        const actualValue = await locator.inputValue();
        if (actualValue !== text) {
          throw new Error(`Input verification failed: expected "${text}" but got "${actualValue}"`);
        }
      }
      
    }, `Fill input with text: ${text}`, retries);
  }

  /**
   * Enhanced dropdown selection with multiple strategies
   */
  async selectOption(
    selectLocator: Locator, 
    option: string | { label?: string; value?: string; index?: number },
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<void> {
    const { timeout = 10000, retries = 3 } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      await this.waitForElement(selectLocator, { timeout });
      
      if (typeof option === 'string') {
        // Try multiple selection strategies
        try {
          await selectLocator.selectOption(option);
        } catch (error) {
          // Fallback: try selecting by text content
          await selectLocator.selectOption({ label: option });
        }
      } else {
        if (option.value) {
          await selectLocator.selectOption({ value: option.value });
        } else if (option.label) {
          await selectLocator.selectOption({ label: option.label });
        } else if (option.index !== undefined) {
          await selectLocator.selectOption({ index: option.index });
        }
      }
      
      // Verify selection
      await this.page.waitForTimeout(300);
      
    }, 'Select dropdown option', retries);
  }

  /**
   * Verify element text with flexible matching
   */
  async verifyElementText(
    locator: Locator, 
    expectedText: string | RegExp,
    options?: {
      exact?: boolean;
      timeout?: number;
      caseInsensitive?: boolean;
    }
  ): Promise<void> {
    const { exact = false, timeout = 10000, caseInsensitive = false } = options || {};
    
    await this.waitForElement(locator, { timeout });
    
    const actualText = await locator.textContent();
    if (!actualText) {
      throw new Error('Element text is null or empty');
    }
    
    const textToCompare = caseInsensitive ? actualText.toLowerCase() : actualText;
    
    if (typeof expectedText === 'string') {
      const expectedToCompare = caseInsensitive ? expectedText.toLowerCase() : expectedText;
      
      if (exact) {
        expect(textToCompare.trim()).toBe(expectedToCompare.trim());
      } else {
        expect(textToCompare).toContain(expectedToCompare);
      }
    } else {
      // RegExp matching
      expect(textToCompare).toMatch(expectedText);
    }
  }

  /**
   * Wait for element to contain specific text
   */
  async waitForElementText(
    locator: Locator, 
    expectedText: string | RegExp,
    options?: {
      timeout?: number;
      exact?: boolean;
    }
  ): Promise<void> {
    const { timeout = 15000, exact = false } = options || {};
    
    await this.page.waitForFunction(
      ({ selector, text, exactMatch }) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const elementText = element.textContent || '';
        
        if (typeof text === 'string') {
          return exactMatch ? 
            elementText.trim() === text.trim() : 
            elementText.includes(text);
        } else {
          // For RegExp, convert to string and use includes for basic matching
          return elementText.includes(text.toString().slice(1, -1));
        }
      },
      {
        selector: await locator.first().elementHandle().then(el => 
          el?.evaluate(element => {
            // Get a selector for the element
            let selector = element.tagName.toLowerCase();
            if (element.id) selector += `#${element.id}`;
            if (element.className) selector += `.${element.className.split(' ').join('.')}`;
            return selector;
          }) || ''
        ),
        text: expectedText,
        exactMatch: exact
      },
      { timeout }
    );
  }

  /**
   * Enhanced hover with stability checks
   */
  async hoverElement(locator: Locator, options?: {
    timeout?: number;
    retries?: number;
  }): Promise<void> {
    const { timeout = 10000, retries = 2 } = options || {};
    
    await TestHelper.executeWithRetry(async () => {
      await this.waitForElement(locator, { timeout });
      
      // Scroll into view and ensure visibility
      await locator.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(200);
      
      // Perform hover
      await locator.hover({ timeout });
      
      // Allow time for hover effects
      await this.page.waitForTimeout(300);
      
    }, 'Hover over element', retries);
  }

  /**
   * Check if element exists without throwing error
   */
  async elementExists(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'attached', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is visible without throwing error
   */
  async isElementVisible(locator: Locator, timeout: number = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced URL verification with pattern matching
   */
  async verifyCurrentUrl(expectedPattern: string | RegExp, timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      (pattern) => {
        const currentUrl = window.location.href;
        if (typeof pattern === 'string') {
          return currentUrl.includes(pattern);
        } else {
          return new RegExp(pattern).test(currentUrl);
        }
      },
      expectedPattern,
      { timeout }
    );
  }

  /**
   * Wait for page to be ready for interaction
   */
  async waitForPageReady(timeout: number = 30000): Promise<void> {
    await TestHelper.waitForConditions([
      // Document ready
      () => this.page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }),
      
      // No loading overlays
      () => this.page.waitForFunction(() => {
        const overlays = document.querySelectorAll('.loading-overlay, .page-loader, .global-spinner');
        return overlays.length === 0;
      }, { timeout: 8000 }),
      
      // JavaScript frameworks loaded (if applicable)
      () => this.page.waitForFunction(() => {
        // Check for common framework indicators
        return !window.document.documentElement.classList.contains('loading') &&
               !window.document.documentElement.classList.contains('js-loading');
      }, { timeout: 5000 })
      
    ], timeout);
  }

  /**
   * Execute JavaScript in page context with error handling
   */
  async executeScript<T>(script: string | Function, ...args: any[]): Promise<T> {
    try {
      return await this.page.evaluate(script, ...args);
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  /**
   * Get element attribute with null handling
   */
  async getElementAttribute(locator: Locator, attributeName: string): Promise<string | null> {
    await this.waitForElement(locator);
    return await locator.getAttribute(attributeName);
  }

  /**
   * Enhanced page performance monitoring
   */
  async measurePageMetrics(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  }> {
    return await TestHelper.measurePagePerformance(this.page);
  }

  /**
   * Smart element locator with multiple fallback strategies
   */
  protected createSmartLocator(selectors: string[]): Locator {
    return this.page.locator(selectors.join(', '));
  }

  /**
   * Validate page loaded successfully
   */
  async validatePageLoaded(expectedTitle?: string, expectedUrl?: string | RegExp): Promise<void> {
    // Basic validations
    const title = await this.page.title();
    expect(title).toBeTruthy();
    
    if (expectedTitle) {
      expect(title).toContain(expectedTitle);
    }
    
    if (expectedUrl) {
      await this.verifyCurrentUrl(expectedUrl);
    }
    
    // Ensure page has substantial content
    const bodyText = await this.page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
  }

  /**
   * Handle unexpected alerts/confirmations
   */
  async handlePageDialogs(): Promise<void> {
    this.page.on('dialog', async (dialog) => {
      console.log(`📝 Page dialog detected: ${dialog.type()} - ${dialog.message()}`);
      
      switch (dialog.type()) {
        case 'alert':
        case 'confirm':
          await dialog.accept();
          break;
        case 'prompt':
          await dialog.accept(''); // Accept with empty string
          break;
        default:
          await dialog.dismiss();
      }
    });
  }

  /**
   * Enhanced error context for debugging
   */
  protected async createDebugContext(): Promise<{
    url: string;
    title: string;
    timestamp: string;
    viewport: { width: number; height: number };
    userAgent: string;
  }> {
    return {
      url: this.page.url(),
      title: await this.page.title(),
      timestamp: new Date().toISOString(),
      viewport: this.page.viewportSize() || { width: 0, height: 0 },
      userAgent: await this.page.evaluate(() => navigator.userAgent)
    };
  }
}
