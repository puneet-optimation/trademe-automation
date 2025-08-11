# TradeMe Playwright Test Automation

A comprehensive test automation solution for TradeMe Sandbox using Playwright with TypeScript and Page Object Model.

## 🏗️ Architecture

### Page Object Model Structure
```
├── pages/
│   ├── BasePage.ts          # Base class with common functionality
│   ├── HomePage.ts          # Home page interactions
│   ├── MarketplacePage.ts   # Marketplace page interactions
│   └── CategoryPage.ts      # Category/search results page interactions
├── tests/
│   ├── trademe-regression.spec.ts  # Main regression tests
│   └── visual-regression.spec.ts   # Visual regression tests
├── utils/
│   └── TestHelper.ts        # Utility functions
└── test-results/            # Generated test artifacts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/puneet-optimation/trademe-automation.git
cd trademe-automation

# Install dependencies
npm install

# Install browser binaries
npm run install:browsers
```

### Running Tests
```bash
# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test
npm run test:specific "Test Case #78959"

# Debug mode
npm run test:debug

# View test report
npm run report
```

## 🧪 Test Case #78959: Category Navigation and Price Sorting

### Test Steps Automated:
1. ✅ Navigate to Trade Me Sandbox home page
2. ✅ Click on "Marketplace" link in navigation
3. ✅ Click on "Home & living" category link
4. ✅ Verify search results are displayed (count > 0)
5. ✅ Ensure List view is active
6. ✅ Select "Lowest price" from Sort dropdown
7. ✅ Verify URL contains `sort_order=priceasc`
8. ✅ Verify prices are sorted in ascending order

## 📊 CI/CD Pipeline

This repository includes a GitHub Actions workflow that:
- Runs tests on multiple browsers (Chrome, Firefox, Safari)
- Generates comprehensive test reports
- Captures screenshots and videos on failures
- Provides test artifacts for download

### Workflow Features:
- **Triggered on**: Push to main, Pull Requests, Manual dispatch
- **Parallel execution** across multiple browsers
- **Artifact collection** (reports, screenshots, videos)
- **Slack notifications** on failures

## 🔧 Configuration

The automation includes:
- **Cross-browser testing** (Chrome, Firefox, Safari, Mobile)
- **Visual regression testing** with screenshot comparisons
- **Accessibility-focused selectors** for maintainability
- **Comprehensive error handling** and retry mechanisms
- **Detailed reporting** (HTML, JUnit, JSON)

## 📈 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📚 Documentation

For detailed documentation, configuration options, and best practices, see the complete documentation in the repository files.
