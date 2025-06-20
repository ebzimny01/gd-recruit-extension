# System Patterns: GD Recruit Assistant Browser Extension

## Architecture Overview

### Extension Architecture Pattern
```
Browser Extension (Manifest V3)
├── Service Worker (background.js)
│   ├── Data Processing
│   ├── Storage Management
│   └── Message Handling
├── Content Scripts
│   ├── Page Detection
│   ├── Data Scraping
│   └── DOM Injection
└── Popup Interface (Full-Screen Tab)
    ├── UI Components
    ├── Data Visualization
    └── User Interactions
```

### Core Component Relationships

#### 1. Popup Interface (Primary UI)
**Location**: `popup/`
- **popup.html**: Main UI structure with tabbed interface
- **popup.css**: Responsive styling with accessibility features
- **popup.js**: Core application logic and state management
- **communications.js**: Background script communication layer
- **error-handler.js**: Centralized error handling and user feedback

#### 2. Content Scripts (Page Integration)
**Location**: `content/`
- **page-detector.js**: Identifies GD recruiting pages and triggers appropriate handlers
- **scraper.js**: Main data extraction logic for recruit information
- **background-overlay.js**: UI overlays and page enhancement features
- **office-page-handler.js**: Handles GD office pages specifically
- **watchlist-scraper.js**: Specialized scraping for watchlist data

#### 3. Background Processing (Service Worker)
**Location**: `background.js`
- **Message Routing**: Handles communication between popup and content scripts
- **Data Processing**: Transforms raw scraped data into structured format
- **Storage Operations**: Manages local storage persistence
- **Error Handling**: Centralized error logging and recovery

#### 4. Library Modules (Shared Logic)
**Location**: `lib/`
- **storage.js**: Data persistence abstraction layer
- **calculator.js**: Role rating calculations and recruit scoring
- **debug-tools.js**: Development and debugging utilities
- **version.js**: Version management and migration logic

#### 5. Configuration Modules
**Location**: `modules/` and `data/`
- **bold-attributes-config.js**: Position-specific attribute highlighting
- **role_ratings_defaults.json**: Default position rating configurations
- **bold_attributes_defaults.json**: Default attribute highlighting rules
- **gdr.csv**: Reference data for recruit information

## Key Design Patterns

### 1. Message Passing Pattern
**Implementation**: Chrome Extension Message API
```javascript
// Popup to Background
chrome.runtime.sendMessage({
    action: 'processData',
    data: scrapedData
}, response => {
    // Handle response
});

// Background to Content Script
chrome.tabs.sendMessage(tabId, {
    action: 'scrapeData',
    options: scrapeOptions
});
```

**Purpose**: Secure communication between isolated extension contexts

### 2. Storage Abstraction Pattern
**Implementation**: `lib/storage.js`
```javascript
// Centralized storage operations
await Storage.save('recruits', recruitData);
const recruits = await Storage.load('recruits');
await Storage.clear('recruits');
```

**Benefits**:
- Consistent API across components
- Error handling and validation
- Data migration support
- Performance optimization

### 3. Observer Pattern for UI Updates
**Implementation**: Event-driven UI updates
```javascript
// Data change notifications
document.addEventListener('dataUpdated', (event) => {
    updateDisplay(event.detail.data);
});

// Filter change handling
filterInputs.addEventListener('input', debounce(applyFilters, 300));
```

**Purpose**: Responsive UI without tight coupling

### 4. Command Pattern for User Actions
**Implementation**: Action-based user interaction handling
```javascript
const actions = {
    scrapeData: () => triggerScraping(),
    exportData: () => generateExport(),
    clearData: () => confirmAndClear()
};

document.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (actions[action]) actions[action]();
});
```

### 5. Strategy Pattern for Data Processing
**Implementation**: Configurable data processing pipelines
```javascript
// Role rating calculation strategies
const ratingStrategies = {
    quarterback: (attributes) => calculateQBRating(attributes),
    runningback: (attributes) => calculateRBRating(attributes),
    // ... other positions
};

const rating = ratingStrategies[position](recruitAttributes);
```

## Data Flow Architecture

### 1. Data Extraction Flow
```
GD Recruiting Page → Content Script → Data Validation → Background Processing → Storage
```

**Process**:
1. Page detector identifies GD recruiting pages
2. Scraper extracts raw HTML data
3. Data validator ensures integrity
4. Background processor transforms to structured format
5. Storage layer persists data locally

### 2. User Interaction Flow
```
User Action → Popup Interface → Data Processing → UI Update → Storage Sync
```

**Process**:
1. User triggers action (filter, sort, config change)
2. Popup interface processes user input
3. Data layer applies changes
4. UI updates reflect new state
5. Storage syncs changes for persistence

### 3. Configuration Management Flow
```
Default Config → User Customization → Validation → Storage → Runtime Application
```

**Process**:
1. Load default configurations from JSON files
2. Apply user customizations if available
3. Validate configuration integrity
4. Store validated configuration
5. Apply configuration to runtime behavior

## Performance Optimization Patterns

### 1. Virtual Scrolling
**Implementation**: Large dataset handling
```javascript
// Only render visible rows
const visibleRange = calculateVisibleRange(scrollTop, itemHeight);
const visibleItems = data.slice(visibleRange.start, visibleRange.end);
renderItems(visibleItems);
```

### 2. Debounced Operations
**Implementation**: Reduce unnecessary processing
```javascript
// Debounce filter operations
const debouncedFilter = debounce((filterCriteria) => {
    applyFilters(filterCriteria);
    updateDisplay();
}, 300);
```

### 3. Result Caching
**Implementation**: Cache filtered/sorted results
```javascript
// Cache filter results
const cacheKey = JSON.stringify(filterCriteria);
if (filterCache.has(cacheKey)) {
    return filterCache.get(cacheKey);
}
const results = performFilter(data, filterCriteria);
filterCache.set(cacheKey, results);
return results;
```

### 4. Batch DOM Operations
**Implementation**: Minimize DOM manipulations
```javascript
// Batch DOM updates
const fragment = document.createDocumentFragment();
items.forEach(item => {
    const element = createItemElement(item);
    fragment.appendChild(element);
});
container.appendChild(fragment);
```

## Error Handling Patterns

### 1. Centralized Error Handler
**Implementation**: `popup/error-handler.js`
```javascript
class ErrorHandler {
    static handle(error, context) {
        console.error(`Error in ${context}:`, error);
        this.showUserMessage(this.getUserFriendlyMessage(error));
        this.logError(error, context);
    }
}
```

### 2. Graceful Degradation
**Implementation**: Feature fallbacks
```javascript
// Fallback for advanced features
try {
    enableAdvancedFeature();
} catch (error) {
    console.warn('Advanced feature unavailable, using fallback');
    enableBasicFeature();
}
```

### 3. Data Validation Pipeline
**Implementation**: Multi-layer validation
```javascript
// Data validation pipeline
const validators = [
    validateRequired,
    validateTypes,
    validateRanges,
    validateBusinessRules
];

function validateData(data) {
    return validators.every(validator => validator(data));
}
```

## Security Patterns

### 1. Input Sanitization
**Implementation**: XSS prevention
```javascript
// Sanitize user input
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, MAX_INPUT_LENGTH);
}
```

### 2. Content Security Policy
**Implementation**: CSP headers in manifest
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'"
    }
}
```

### 3. Permission Minimization
**Implementation**: Minimal required permissions
```json
{
    "permissions": [
        "storage",
        "activeTab",
        "scripting"
    ],
    "host_permissions": ["https://*.whatifsports.com/*"]
}
```

## Accessibility Patterns

### 1. Keyboard Navigation
**Implementation**: Focus management
```javascript
// Keyboard navigation support
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1': switchToTab('dashboard'); break;
            case '2': switchToTab('recruits'); break;
            case '3': switchToTab('settings'); break;
        }
    }
});
```

### 2. ARIA Implementation
**Implementation**: Screen reader support
```html
<!-- Proper ARIA labeling -->
<table role="table" aria-label="Recruit data">
    <thead>
        <tr role="row">
            <th role="columnheader" aria-sort="ascending">Name</th>
        </tr>
    </thead>
</table>
```

### 3. Focus Management
**Implementation**: Logical tab order
```javascript
// Focus management for modals
function openModal(modal) {
    const focusableElements = modal.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElements[0]?.focus();
}
```

## Testing Patterns

### 1. Component Testing
**Implementation**: Isolated component validation
```javascript
// Test individual components
function testFilterComponent() {
    const testData = generateTestRecruits();
    const filters = { position: 'QB' };
    const results = applyFilters(testData, filters);
    assert(results.every(r => r.position === 'QB'));
}
```

### 2. Integration Testing
**Implementation**: End-to-end workflow validation
```javascript
// Test complete workflows
async function testDataImportWorkflow() {
    await scrapeTestPage();
    const data = await Storage.load('recruits');
    assert(data.length > 0);
    assert(validateDataStructure(data));
}
```

### 3. Performance Testing
**Implementation**: Load and response time validation
```javascript
// Performance benchmarks
function benchmarkFilterPerformance() {
    const largeDataset = generateTestRecruits(1000);
    const startTime = performance.now();
    applyFilters(largeDataset, complexFilters);
    const endTime = performance.now();
    assert(endTime - startTime < 500); // Under 500ms
}
