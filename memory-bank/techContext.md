# Technical Context: GD Recruit Assistant Browser Extension

## Technology Stack

### Core Technologies
- **JavaScript ES6+**: Modern JavaScript features and syntax
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Responsive design with Flexbox and Grid
- **Chrome Extension API**: Manifest V3 for modern extension development
- **Web APIs**: Local Storage, DOM APIs, Fetch API

### Browser Extension Framework
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Architecture**: Service Worker + Content Scripts + Popup Interface
- **Permissions Model**: Minimal required permissions for security
- **Storage**: Chrome Extension Storage API for local persistence

### Development Environment
- **Platform**: Windows 11
- **IDE**: Visual Studio Code
- **Shell**: Command Prompt (cmd.exe)
- **Browser Testing**: Chrome 88+, Edge 88+, Firefox 89+
- **Version Control**: Git (implied from project structure)

## Browser Extension Architecture

### Manifest V3 Structure
```json
{
  "manifest_version": 3,
  "name": "GD Recruit Assistant",
  "version": "0.2.0",
  "permissions": [
    "storage", "activeTab", "scripting", "cookies", 
    "tabs", "declarativeNetRequest", "declarativeNetRequestFeedback"
  ],
  "host_permissions": ["https://*.whatifsports.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Service Worker Pattern
**File**: `background.js`
- **Type**: ES6 Module
- **Purpose**: Background processing, message routing, data transformation
- **Lifecycle**: Event-driven, dormant when inactive
- **Communication**: Message passing with popup and content scripts

### Content Script Integration
**Injection Strategy**: Conditional based on URL patterns
```json
"content_scripts": [
  {
    "matches": ["https://*.whatifsports.com/gd/recruiting/*"],
    "js": ["content/page-detector.js", "content/background-overlay.js"]
  },
  {
    "matches": ["https://*.whatifsports.com/gd/office/*"],
    "js": ["content/office-page-handler.js"]
  }
]
```

### Popup Interface Architecture
**Implementation**: Full-screen tab interface (popup-based)
- **Entry Point**: `popup/popup.html`
- **Main Logic**: `popup/popup.js`
- **Styling**: `popup/popup.css`
- **Communication**: `popup/communications.js`
- **Error Handling**: `popup/error-handler.js`

## Development Patterns

### Module Organization
```
📁 Project Structure
├── 📄 manifest.json          # Extension configuration
├── 📄 background.js          # Service worker
├── 📁 popup/                 # Main UI components
├── 📁 content/               # Page integration scripts
├── 📁 lib/                   # Shared utilities
├── 📁 modules/               # Reusable modules
├── 📁 data/                  # Configuration data
└── 📁 icons/                 # Extension icons
```

### JavaScript Patterns
- **ES6 Modules**: Import/export for modular code
- **Async/Await**: Modern asynchronous programming
- **Arrow Functions**: Concise function syntax
- **Destructuring**: Clean object/array access
- **Template Literals**: String interpolation
- **Classes**: Object-oriented programming where appropriate

### CSS Architecture
- **Responsive Design**: Mobile-first approach with media queries
- **Flexbox/Grid**: Modern layout techniques
- **Custom Properties**: CSS variables for theming
- **BEM Methodology**: Block-Element-Modifier naming convention
- **Accessibility**: High contrast, focus indicators, screen reader support

### Error Handling Strategy
```javascript
// Centralized error handling pattern
class ErrorHandler {
    static handle(error, context) {
        console.error(`Error in ${context}:`, error);
        this.showUserMessage(this.getUserFriendlyMessage(error));
        this.logError(error, context);
    }
}
```

## Data Management

### Storage Architecture
**Implementation**: Chrome Extension Storage API
```javascript
// Storage abstraction layer (lib/storage.js)
class Storage {
    static async save(key, data) {
        return chrome.storage.local.set({ [key]: data });
    }
    
    static async load(key) {
        const result = await chrome.storage.local.get(key);
        return result[key];
    }
}
```

### Data Structure Patterns
```javascript
// Recruit data structure
const recruitData = {
    id: 'unique_identifier',
    name: 'string',
    position: 'string',
    potential: 'number',
    division: 'string',
    // ... other attributes
    metadata: {
        scrapedAt: 'timestamp',
        source: 'page_url'
    }
};
```

### Configuration Management
- **Default Configurations**: JSON files in `data/` directory
- **User Customizations**: Stored in Chrome Extension Storage
- **Validation**: Multi-layer validation pipeline
- **Migration**: Version-aware configuration upgrades

## Performance Optimization

### Virtual Scrolling Implementation
```javascript
// Handle large datasets efficiently
class VirtualScrollManager {
    constructor(container, itemHeight) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    }
    
    render(data, scrollTop) {
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, data.length);
        return data.slice(startIndex, endIndex);
    }
}
```

### Debouncing Pattern
```javascript
// Reduce unnecessary operations
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}
```

### Caching Strategy
```javascript
// Result caching for expensive operations
class FilterCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            // Move to end (LRU)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
}
```

## Security Implementation

### Input Sanitization
```javascript
// XSS prevention
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim()
        .substring(0, 1000); // Length limit
}
```

### Content Security Policy
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
    }
}
```

### Permission Model
- **Minimal Permissions**: Only request necessary permissions
- **Host Restrictions**: Limited to whatifsports.com domain
- **Local Storage Only**: No external data transmission
- **User Control**: Complete control over data management

## Accessibility Implementation

### WCAG 2.1 AA Compliance
```html
<!-- Semantic HTML structure -->
<main role="main" aria-label="Recruit Management Interface">
    <nav role="tablist" aria-label="Main navigation">
        <button role="tab" aria-selected="true" aria-controls="dashboard-panel">
            Dashboard
        </button>
    </nav>
</main>
```

### Keyboard Navigation
```javascript
// Comprehensive keyboard support
document.addEventListener('keydown', (event) => {
    // Global shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1': switchToTab('dashboard'); break;
            case '2': switchToTab('recruits'); break;
            case '3': switchToTab('settings'); break;
            case 'f': focusFilterControls(); break;
        }
    }
    
    // Arrow key navigation
    if (event.key.startsWith('Arrow')) {
        handleArrowNavigation(event);
    }
});
```

### Screen Reader Support
```javascript
// Dynamic ARIA updates
function updateTableSort(columnName, direction) {
    const header = document.querySelector(`[data-column="${columnName}"]`);
    header.setAttribute('aria-sort', direction);
    
    // Announce change to screen readers
    const announcement = `Table sorted by ${columnName} ${direction}`;
    announceToScreenReader(announcement);
}
```

## Development Tools

### Debugging Utilities
**File**: `lib/debug-tools.js`
```javascript
class DebugTools {
    static log(message, data = null) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[GD Recruit Assistant] ${message}`, data);
        }
    }
    
    static timeOperation(name, operation) {
        const start = performance.now();
        const result = operation();
        const end = performance.now();
        this.log(`${name} took ${end - start}ms`);
        return result;
    }
}
```

### Version Management
**File**: `lib/version.js`
```javascript
class VersionManager {
    static getCurrentVersion() {
        return chrome.runtime.getManifest().version;
    }
    
    static async migrateData(fromVersion, toVersion) {
        // Handle data migrations between versions
        const migrations = this.getMigrationPath(fromVersion, toVersion);
        for (const migration of migrations) {
            await migration.execute();
        }
    }
}
```

## Testing Strategy

### Manual Testing Approach
1. **Cross-Browser Testing**: Chrome, Edge, Firefox compatibility
2. **Accessibility Testing**: Screen reader and keyboard navigation
3. **Performance Testing**: Large dataset handling (1000+ recruits)
4. **User Workflow Testing**: End-to-end feature validation
5. **Error Scenario Testing**: Network failures, invalid data, etc.

### Performance Benchmarks
```javascript
// Performance validation
const PERFORMANCE_TARGETS = {
    initialLoad: 2000,      // 2 seconds
    filterResponse: 500,    // 500ms
    dataProcessing: 1000,   // 1 second
    uiUpdate: 100          // 100ms
};
```

## Build and Deployment

### Development Workflow
1. **Local Development**: Load unpacked extension in Chrome
2. **Testing**: Manual testing across target browsers
3. **Validation**: Extension validation tools
4. **Packaging**: ZIP file creation for distribution
5. **Documentation**: Update README and documentation

### Extension Packaging
```bash
# Package extension for distribution
zip -r gdrecruit_browser_extension.zip . -x "*.git*" "*.md" "memory-bank/*"
```

### Browser Compatibility
- **Chrome 88+**: Primary target, full feature support
- **Edge 88+**: Chromium-based, full compatibility
- **Firefox 89+**: Compatible with minor modifications
- **Mobile Browsers**: Responsive design support

## Configuration Files

### Default Configurations
- **Role Ratings**: `data/role_ratings_defaults.json`
- **Bold Attributes**: `data/bold_attributes_defaults.json`
- **Reference Data**: `data/gdr.csv`
- **Ruleset**: `rules_1.json` (declarativeNetRequest)

### Runtime Configuration
```javascript
// Configuration loading pattern
async function loadConfiguration() {
    const defaults = await fetch('/data/role_ratings_defaults.json').then(r => r.json());
    const userConfig = await Storage.load('userRoleRatings');
    return { ...defaults, ...userConfig };
}
```

## External Dependencies

### Third-Party Libraries
- **XLSX.js**: `modules/xlsx.full.min.js` for Excel export functionality
- **No other external dependencies**: Self-contained implementation

### Web APIs Used
- **Chrome Extension APIs**: Core extension functionality
- **DOM APIs**: User interface manipulation
- **Fetch API**: Data loading (internal resources only)
- **Local Storage API**: Data persistence
- **Performance API**: Performance monitoring
