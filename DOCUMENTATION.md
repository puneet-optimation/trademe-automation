# 🧪 Test Automation Framework Documentation

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Test Case Documentation](#test-case-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

This repository contains a comprehensive Playwright test automation framework for TradeMe Sandbox, implementing:

- **Page Object Model (POM)** for maintainable test structure
- **Accessibility-first selectors** for robust element identification
- **Visual regression testing** for UI consistency validation
- **Cross-browser testing** across Chrome, Firefox, Safari, and Mobile
- **CI/CD pipeline** with GitHub Actions for automated test execution

## 🏗️ Architecture

### Directory Structure
```
trademe-automation/
├── .github/
│   └── workflows/
│       └── playwright-tests.yml     # CI/CD pipeline configuration
├── pages/                           # Page Object Model classes
│   ├── BasePage.ts                 # Common functionality base class
│   ├── HomePage.ts                 # Home page interactions
│   ├── MarketplacePage.ts          # Marketplace page interactions
│   └── CategoryPage.ts             # Category/search results page
├── tests/                          # Test specifications
│   ├── trademe-regression.spec.ts  # Main regression tests
│   └── visual-regression.spec.ts   # Visual regression tests
├── utils/                          # Utility functions
│   └── TestHelper.ts               # Common helper functions
├── playwright.config.ts            # Playwright configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Project documentation
```

### Key Design Patterns

#### Page Object Model
- **BasePage**: Contains common functionality (navigation, waits, screenshots)
- **Page-specific classes**: Encapsulate page elements and actions
- **Method chaining**: Enables fluent test writing
- **Error handling**: Built-in retry mechanisms and detailed error messages

#### Selector Strategy
1. **Accessibility-first**: `getByRole`, `getByLabel`, `getByText`
2. **Semantic HTML**: Leverage heading levels, navigation landmarks
3. **Fallback options**: Multiple selector strategies with `.or()`
4. **Stable attributes**: Prefer semantic selectors over CSS classes

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Git

### Local Development Setup
```bash
# 1. Clone the repository
git clone https://github.com/puneet-optimation/trademe-automation.git
cd trademe-automation

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npm run install:browsers

# 4. Verify setup
npm test -- --dry-run
```

### IDE Configuration
For optimal development experience with VS Code:
```json
// .vscode/settings.json
{
  "typescript.preferences.quoteStyle": "single",
  "editor.formatOnSave": true,
  "playwright.reuseBrowser": true
}
```

## 🧪 Running Tests

### Local Test Execution
```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/trademe-regression.spec.ts

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Run specific test case
npm run test:specific "Test Case #78959"

# Debug mode
npm run test:debug

# Generate and view HTML report
npm run report
```

### Test Filtering Options
```bash
# Run tests by project (browser)
npx playwright test --project=chromium

# Run tests by tag
npx playwright test --grep="@smoke"

# Run failed tests only
npx playwright test --last-failed

# Run tests with specific timeout
npx playwright test --timeout=60000
```

### Environment Variables
```bash
# Set base URL
export BASE_URL=https://www.tmsandbox.co.nz

# Set headless mode
export HEADLESS=false

# Set timeout
export TIMEOUT_MS=30000
```

## 🔄 CI/CD Pipeline

### Workflow Triggers
The GitHub Actions workflow runs on:
- **Push to main/develop branches**
- **Pull requests to main**
- **Manual dispatch** (workflow_dispatch)

### Workflow Features
- **Multi-browser testing** (Chrome, Firefox, Safari)
- **Mobile testing** (Chrome Mobile)
- **Parallel execution** for faster results
- **Artifact collection** (reports, screenshots, videos)
- **Test result publishing** with JUnit reports
- **PR comments** with test summaries
- **Slack notifications** on failures

### Manual Workflow Execution
1. Navigate to **Actions** tab in GitHub
2. Select **"🎭 TradeMe Playwright Tests"**
3. Click **"Run workflow"**
4. Choose test type:
   - `all`: Run all tests
   - `regression`: Run regression tests only
   - `visual`: Run visual regression tests
   - `specific`: Run tests matching pattern

### Workflow Jobs
1. **test**: Main test execution across browsers
2. **test-mobile**: Mobile-specific testing
3. **publish-results**: Aggregate and publish results
4. **slack-notification**: Failure notifications

## 📖 Test Case Documentation

### Test Case #78959: Category Navigation and Price Sorting

**Objective**: Verify user can navigate to a category and sort products by price

**Test Steps**:
1. Navigate to Trade Me Sandbox home page
2. Click "Marketplace" link in navigation
3. Click "Home & living" category link
4. Verify search results are displayed (count > 0)
5. Ensure List view is active
6. Select "Lowest price" from Sort dropdown
7. Verify URL contains `sort_order=priceasc`
8. Verify prices are sorted in ascending order

**Expected Results**:
- All navigation steps complete successfully
- Search results display more than 0 items
- Price sorting functionality works correctly
- URL parameters update appropriately

### Data-Driven Test Variants
- **Ascending sort**: "Lowest price" → `priceasc`
- **Descending sort**: "Highest price" → `pricedesc`

### Visual Regression Tests
- **Homepage**: Layout and content verification
- **Marketplace**: Category navigation interface
- **Sorted results**: Price sorting display validation

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Test Failures
```bash
# Issue: Element not found
# Solution: Check selector strategy and add explicit waits
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });

# Issue: Network timeouts
# Solution: Increase timeout in playwright.config.ts
use: {
  navigationTimeout: 60000,
  actionTimeout: 15000,
}

# Issue: Flaky tests
# Solution: Add retry mechanism and network idle waits
await page.waitForLoadState('networkidle');
```

#### CI/CD Issues
```bash
# Issue: Browser installation fails
# Solution: Check GitHub Actions runner and Playwright version compatibility

# Issue: Tests timeout in CI
# Solution: Reduce parallel workers in CI environment
workers: process.env.CI ? 1 : undefined,
```

#### Visual Regression Issues
```bash
# Issue: Screenshot differences
# Solution: Update baseline images or adjust threshold
npm run test -- --update-snapshots

# Issue: Cross-platform differences
# Solution: Use Docker for consistent environments
```

### Debug Commands
```bash
# Debug specific test
npx playwright test tests/trademe-regression.spec.ts --debug

# View trace files
npx playwright show-trace test-results/.../trace.zip

# Generate detailed report
npx playwright show-report

# Run tests with verbose output
npx playwright test --verbose
```

### Performance Optimization
```bash
# Reduce resource usage
npx playwright test --workers=1

# Skip video recording
use: { video: 'off' }

# Disable screenshots
use: { screenshot: 'off' }
```

## 📊 Reporting and Analytics

### Generated Artifacts
- **HTML Report**: Interactive test results with traces
- **JUnit XML**: CI/CD integration compatibility
- **JSON Results**: Custom reporting and analytics
- **Screenshots**: Failure documentation
- **Videos**: Test execution recordings
- **Traces**: Detailed step-by-step execution logs

### Custom Reporting
The framework generates comprehensive reports including:
- Test execution summary
- Browser-specific results
- Performance metrics
- Error screenshots and videos
- Network activity logs

## 🔒 Security and Best Practices

### Security Considerations
- No sensitive data in test code
- Environment variables for configuration
- Secure artifact handling in CI/CD
- Limited network access in test environment

### Best Practices Implemented
- **DRY Principle**: Reusable page objects and utilities
- **Single Responsibility**: Each class has focused purpose
- **Error Handling**: Comprehensive exception management
- **Type Safety**: Full TypeScript implementation
- **Documentation**: Inline comments and README

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-test`
3. Add tests following existing patterns
4. Ensure all tests pass locally
5. Submit pull request with description

### Code Standards
- Use TypeScript for type safety
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Include test case documentation
- Update README for new features

### Pull Request Process
1. Ensure CI/CD pipeline passes
2. Include test case documentation
3. Add visual regression tests if UI changes
4. Request review from team members
5. Address feedback before merge

---

**Repository**: https://github.com/puneet-optimation/trademe-automation  
**CI/CD Pipeline**: GitHub Actions  
**Test Framework**: Playwright with TypeScript  
**Reporting**: HTML, JUnit, JSON formats
