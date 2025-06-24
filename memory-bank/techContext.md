# Technical Context: GD Recruit Assistant Browser Extension

## Technology Stack

### Core Technologies
- **JavaScript ES6+**: Modern JavaScript features and syntax
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Responsive design with Flexbox and Grid
- **Chrome Extension API**: Manifest V3 for modern extension development
- **Web APIs**: Local Storage, DOM APIs, Fetch API, IndexedDB

### Browser Extension Framework
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Architecture**: Service Worker + Content Scripts + Popup Interface
- **Permissions Model**: Minimal required permissions for security
- **Storage**: Multi-team IndexedDB architecture with Chrome Extension Storage API fallback

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
  "version": "0.5.0",
  "permissions": [
    "storage", "activeTab", "scripting", "cookies", "declarativeNetRequest"
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
- **Purpose**: Multi-team management, cookie monitoring, data transformation, message routing
- **Lifecycle**: Event-driven, dormant when inactive
- **Communication**: Message passing with popup and content scripts
- **Team Management**: Cookie-based team detection and automatic switching

### Content Script Integration

**Injection Strategy**: Conditional based on URL patterns
```json
"content_scripts": [
  {
    "matches": ["https://*.whatifsports.com/gd/recruiting/*"],
    "js": ["content/page-detector.js", "content/background-overlay.js"]
  },
]
```

### Popup Interface Architecture
**Implementation**: Full-screen tab interface (popup-based)
- **Entry Point**: `popup/popup.html`
- **Main Logic**: `popup/popup.js` with advanced table styling functions
- **Styling**: `popup/popup.css` with custom cell styling classes
- **Communication**: `popup/communications.js`
- **Error Handling**: `popup/error-handler.js`

## Multi-Team Storage Architecture

### Database Structure
**Master Database**: `gdRecruitDB_master`
```javascript
// Master database schema
{
  teams: {
    [teamId]: {
      teamId: 'string',
      schoolName: 'string',
      division: 'string',
      world: 'string',
      schoolLong: 'string',
      schoolShort: 'string',
      conference: 'string',
      firstSeen: 'timestamp',
      lastAccessed: 'timestamp'
    }
  },
  globalConfig: {
    [configKey]: 'value'
  }
}
```

**Team-Specific Databases**: `gdRecruitDB_[teamId]`
```javascript
// Team database schema
{
  recruits: {
    [recruitId]: 'recruitObject'
  },
  config: {
    [configKey]: 'configValue'
  },
  teamMetadata: {
    currentSeason: 'number',
    lastUpdated: 'timestamp',
    recruitCount: 'number',
    watchlistCount: 'number',
    teamInfo: 'object'
  }
}
```

### Storage Implementation
**File**: `lib/multi-team-storage.js`
```javascript
class MultiTeamRecruitStorage {
  constructor() {
    this.MASTER_DB_NAME = 'gdRecruitDB_master';
    this.teamStorageInstances = new Map();
    this.currentTeamId = null;
    this.currentTeamStorage = null;
  }
  
  async setActiveTeam(teamId, teamInfo) {
    await this._ensureTeamRegistered(teamId, teamInfo);
    const teamStorage = await this._getTeamStorage(teamId);
    this.currentTeamId = teamId;
    this.currentTeamStorage = teamStorage;
  }
}
```

## Development Patterns

### Module Organization
```
📁 Project Structure
├── 📄 manifest.json          # Extension configuration
├── 📄 background.js          # Multi-team service worker
├── 📁 popup/                 # Main UI components
├── 📁 content/               # Page integration scripts
├── 📁 lib/                   # Shared utilities
│   └── 📄 multi-team-storage.js # Multi-team storage architecture
├── 📁 modules/               # Reusable modules
├── 📁 data/                  # Configuration data
└── 📁 icons/                 # Extension icons
```

### JavaScript Patterns
- **ES6 Modules**: Import/export for modular code
- **Async/Await**: Modern asynchronous programming with IndexedDB
- **Arrow Functions**: Concise function syntax
- **Destructuring**: Clean object/array access
- **Template Literals**: String interpolation
- **Classes**: Object-oriented programming for storage architecture
- **Map/Set Collections**: Efficient team storage instance caching

### CSS Architecture
- **Responsive Design**: Mobile-first approach with media queries
- **Flexbox/Grid**: Modern layout techniques
- **Custom Properties**: CSS variables for theming
- **BEM Methodology**: Block-Element-Modifier naming convention
- **Accessibility**: High contrast, focus indicators, screen reader support

### Error Handling Strategy
```javascript
// Centralized error handling pattern with team context
class ErrorHandler {
    static handle(error, context, teamId = null) {
        const contextInfo = teamId ? `${context} (Team: ${teamId})` : context;
        console.error(`Error in ${contextInfo}:`, error);
        this.showUserMessage(this.getUserFriendlyMessage(error));
        this.logError(error, contextInfo);
    }
}
```

## Data Management

### Multi-Team Storage Architecture
**Implementation**: IndexedDB with team isolation
```javascript
// Team-specific storage abstraction
class TeamSpecificStorage {
    constructor(dbName, teamId) {
        this.DB_NAME = dbName;
        this.teamId = teamId;
        this.STORE_RECRUITS = 'recruits';
        this.STORE_CONFIG = 'config';
        this.STORE_TEAM_METADATA = 'teamMetadata';
    }
    
    async saveRecruit(recruit) {
        return this._executeTransaction(
            this.STORE_RECRUITS, 
            'readwrite',
            (store) => store.put(recruit)
        );
    }
}
```

### Cookie-Based Team Detection
**Implementation**: Background service worker monitoring
```javascript
class TeamCookieMonitor {
    constructor() {
        this.pollInterval = 2000;
        this.lastKnownCookie = null;
        this.isMonitoring = false;
    }
    
    async startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        setInterval(async () => {
            try {
                const currentCookie = await this.getCurrentCookie();
                if (currentCookie !== this.lastKnownCookie) {
                    await this.handleTeamChange(currentCookie);
                    this.lastKnownCookie = currentCookie;
                }
            } catch (error) {
                console.error('Cookie monitoring error:', error);
            }
        }, this.pollInterval);
    }
}
```

### Data Structure Patterns
```javascript
// Enhanced recruit data structure with team context
const recruitData = {
    id: 'unique_identifier',
    name: 'string',
    position: 'string',
    potential: 'number',
    division: 'string',
    // ... other attributes
    metadata: {
        scrapedAt: 'timestamp',
        source: 'page_url',
        teamId: 'team_identifier'
    }
};

// Team registry structure
const teamRegistry = {
    teamId: 'string',
    schoolName: 'string',
    division: 'string',
    world: 'string',
    schoolLong: 'string',
    schoolShort: 'string',
    conference: 'string',
    firstSeen: 'timestamp',
    lastAccessed: 'timestamp'
};
```

### Configuration Management
- **Global Configurations**: Role ratings, bold attributes, column visibility (shared across teams)
- **Team-Specific Configurations**: Season info, last updated, recruit counts, team metadata
- **Smart Routing**: Automatic routing based on configuration type
- **Validation**: Multi-layer validation pipeline with team context
- **Migration**: Version-aware configuration upgrades with team support

## Performance Optimization

### Virtual Scrolling Implementation
```javascript
// Enhanced virtual scrolling for multi-team datasets
class VirtualScrollManager {
    constructor(container, itemHeight) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.teamCache = new Map(); // Cache team-specific data
    }
    
    render(data, scrollTop, teamId) {
        const cacheKey = `${teamId}_${scrollTop}`;
        if (this.teamCache.has(cacheKey)) {
            return this.teamCache.get(cacheKey);
        }
        
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, data.length);
        const result = data.slice(startIndex, endIndex);
        
        this.teamCache.set(cacheKey, result);
        return result;
    }
}
```

### Team Storage Instance Caching
```javascript
// Efficient team storage instance management
class MultiTeamStorage {
    constructor() {
        this.teamStorageInstances = new Map();
        this.maxCachedInstances = 10;
    }
    
    async _getTeamStorage(teamId) {
        if (this.teamStorageInstances.has(teamId)) {
            return this.teamStorageInstances.get(teamId);
        }
        
        // LRU cache management
        if (this.teamStorageInstances.size >= this.maxCachedInstances) {
            const oldestTeam = this.teamStorageInstances.keys().next().value;
            this.teamStorageInstances.get(oldestTeam).close();
            this.teamStorageInstances.delete(oldestTeam);
        }
        
        const teamStorage = new TeamSpecificStorage(`gdRecruitDB_${teamId}`, teamId);
        await teamStorage.initialize();
        this.teamStorageInstances.set(teamId, teamStorage);
        return teamStorage;
    }
}
```

### Debouncing Pattern
```javascript
// Enhanced debouncing with team context
function debounce(func, delay, context = {}) {
    let timeoutId;
    return function (...args) {
        const teamId = context.teamId || 'global';
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.log(`🔍 DEBUG: Executing debounced operation for team ${teamId}`);
            func.apply(this, args);
        }, delay);
    };
}
```

### Result Caching Strategy
```javascript
// Multi-team aware caching
class FilterCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.teamCaches = new Map(); // Separate cache per team
    }
    
    get(key, teamId) {
        const teamCache = this.getTeamCache(teamId);
        const value = teamCache.get(key);
        if (value) {
            // Move to end (LRU)
            teamCache.delete(key);
            teamCache.set(key, value);
        }
        return value;
    }
    
    getTeamCache(teamId) {
        if (!this.teamCaches.has(teamId)) {
            this.teamCaches.set(teamId, new Map());
        }
        return this.teamCaches.get(teamId);
    }
}
```

## Security Implementation

### Input Sanitization
```javascript
// Enhanced XSS prevention with team context validation
function sanitizeInput(input, context = {}) {
    if (typeof input !== 'string') return '';
    
    const sanitized = input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim()
        .substring(0, 1000); // Length limit
    
    // Additional team context validation
    if (context.teamId && !isValidTeamId(context.teamId)) {
        throw new Error('Invalid team context');
    }
    
    return sanitized;
}
```

### Team Data Isolation
```javascript
// Strict team data access control
class TeamSpecificStorage {
    constructor(dbName, teamId) {
        this.teamId = teamId;
        this.DB_NAME = `gdRecruitDB_${teamId}`;
    }
    
    async executeTeamOperation(operation, teamId) {
        if (teamId !== this.teamId) {
            throw new Error(`Unauthorized access: Operation for team ${teamId} attempted on team ${this.teamId} storage`);
        }
        return operation();
    }
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
- **Team Data Isolation**: Strict separation between team databases
- **User Control**: Complete control over multi-team data management

## Accessibility Implementation

### WCAG 2.1 AA Compliance
```html
<!-- Enhanced semantic HTML structure with team context -->
<main role="main" aria-label="Multi-Team Recruit Management Interface">
    <nav role="tablist" aria-label="Main navigation">
        <button role="tab" aria-selected="true" aria-controls="dashboard-panel">
            Dashboard
        </button>
    </nav>
    <section aria-live="polite" aria-label="Team context information">
        <span id="current-team" class="sr-only">Current team: [Team Name]</span>
    </section>
</main>
```

### Keyboard Navigation
```javascript
// Enhanced keyboard support with team switching
document.addEventListener('keydown', (event) => {
    // Global shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1': switchToTab('dashboard'); break;
            case '2': switchToTab('recruits'); break;
            case '3': switchToTab('settings'); break;
            case 'f': focusFilterControls(); break;
            case 't': announceCurrentTeam(); break; // Team context announcement
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
// Enhanced screen reader support with team context
function updateTableSort(columnName, direction, teamName) {
    const header = document.querySelector(`[data-column="${columnName}"]`);
    header.setAttribute('aria-sort', direction);
    
    // Announce change to screen readers with team context
    const announcement = `${teamName} table sorted by ${columnName} ${direction}`;
    announceToScreenReader(announcement);
}

function announceTeamSwitch(fromTeam, toTeam) {
    const announcement = `Switched from ${fromTeam} to ${toTeam}`;
    announceToScreenReader(announcement);
}
```

## Development Tools

### Enhanced Debugging Utilities
**File**: `lib/debug-tools.js`
```javascript
class DebugTools {
    static log(message, data = null, teamId = null) {
        if (process.env.NODE_ENV !== 'production') {
            const teamContext = teamId ? ` [Team: ${teamId}]` : '';
            console.log(`[GD Recruit Assistant]${teamContext} ${message}`, data);
        }
    }
    
    static timeTeamOperation(name, operation, teamId) {
        const start = performance.now();
        const result = operation();
        const end = performance.now();
        this.log(`${name} took ${end - start}ms`, null, teamId);
        return result;
    }
    
    static logTeamSwitch(fromTeam, toTeam, duration) {
        this.log(`Team switch: ${fromTeam} → ${toTeam} (${duration}ms)`);
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
    
    static async migrateMultiTeamData(fromVersion, toVersion) {
        // Handle multi-team data migrations between versions
        const migrations = this.getMultiTeamMigrationPath(fromVersion, toVersion);
        for (const migration of migrations) {
            await migration.execute();
            console.log(`✅ Multi-team migration ${migration.name} completed`);
        }
    }
    
    static async migrateSingleToMultiTeam() {
        // Migration from single-team to multi-team architecture
        const legacyData = await this.getLegacyData();
        if (legacyData) {
            await this.convertToMultiTeamFormat(legacyData);
            console.log('✅ Single-team to multi-team migration completed');
        }
    }
}
```

## Testing Strategy

### Multi-Team Testing Approach
1. **Team Isolation Testing**: Verify data separation between teams
2. **Team Switching Testing**: Validate automatic team detection and switching
3. **Cross-Browser Testing**: Chrome, Edge, Firefox compatibility with multi-team features
4. **Accessibility Testing**: Screen reader and keyboard navigation with team context
5. **Performance Testing**: Large dataset handling across multiple teams (1000+ recruits per team)
6. **User Workflow Testing**: End-to-end multi-team feature validation
7. **Error Scenario Testing**: Team switching failures, database corruption, etc.

### Performance Benchmarks
```javascript
// Enhanced performance validation with multi-team scenarios
const PERFORMANCE_TARGETS = {
    initialLoad: 2000,          // 2 seconds
    filterResponse: 500,        // 500ms
    teamSwitching: 1000,        // 1 second
    dataProcessing: 1000,       // 1 second
    uiUpdate: 100,             // 100ms
    multiTeamDataLoad: 3000,   // 3 seconds for multiple teams
};

// Multi-team performance testing
async function benchmarkMultiTeamOperations() {
    const teams = ['team1', 'team2', 'team3'];
    const startTime = performance.now();
    
    await Promise.all(teams.map(teamId => 
        multiTeamStorage.setActiveTeam(teamId)
    ));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Multi-team operations took ${duration}ms`);
    assert(duration < PERFORMANCE_TARGETS.multiTeamDataLoad);
}
```

## Build and Deployment

### Development Workflow
1. **Local Development**: Load unpacked extension in Chrome with multi-team testing
2. **Multi-Team Testing**: Validate team switching and data isolation
3. **Cross-Browser Testing**: Test multi-team features across target browsers
4. **Performance Validation**: Benchmark multi-team operations
5. **Accessibility Audit**: Verify team context accessibility
6. **Packaging**: ZIP file creation for distribution
7. **Documentation**: Update README and multi-team documentation

### Extension Packaging
```bash
# Package extension for distribution
zip -r gdrecruit_browser_extension.zip . -x "*.git*" "*.md" "memory-bank/*"
```

### Browser Compatibility
- **Chrome 88+**: Primary target, full multi-team feature support
- **Edge 88+**: Chromium-based, full multi-team compatibility
- **Firefox 89+**: Compatible with minor modifications to IndexedDB usage
- **Mobile Browsers**: Responsive design support for multi-team interface

## Configuration Files

### Default Configurations
- **Role Ratings**: `data/role_ratings_defaults.json` (global)
- **Bold Attributes**: `data/bold_attributes_defaults.json` (global)
- **Reference Data**: `data/gdr.csv`
- **Ruleset**: `rules_1.json` (declarativeNetRequest)

### Runtime Configuration
```javascript
// Enhanced configuration loading with team routing
async function loadConfiguration(configType, teamId = null) {
    const defaults = await fetch(`/data/${configType}_defaults.json`).then(r => r.json());
    
    if (isGlobalConfig(configType)) {
        const globalConfig = await multiTeamStorage.getGlobalConfig(configType);
        return { ...defaults, ...globalConfig };
    } else {
        const teamConfig = await multiTeamStorage.getConfig(configType);
        return { ...defaults, ...teamConfig };
    }
}
```

## External Dependencies

### Third-Party Libraries
- **XLSX.js**: `modules/xlsx.full.min.js` for Excel export functionality
- **No other external dependencies**: Self-contained multi-team implementation

### Web APIs Used
- **Chrome Extension APIs**: Core extension functionality with multi-team support
- **IndexedDB API**: Multi-team database architecture
- **DOM APIs**: User interface manipulation
- **Fetch API**: Data loading (internal resources only)
- **Cookies API**: Team detection via wispersisted cookie monitoring
- **Performance API**: Multi-team performance monitoring

## Multi-Team Specific Technologies

### Cookie Monitoring
```javascript
// Real-time cookie monitoring for team detection
const COOKIE_CONFIG = {
    url: 'https://www.whatifsports.com',
    name: 'wispersisted'
};

async function monitorTeamCookie() {
    const cookie = await chrome.cookies.get(COOKIE_CONFIG);
    const teamId = extractTeamId(cookie?.value);
    return teamId;
}
```

### IndexedDB Multi-Database Management
```javascript
// Multiple IndexedDB instances for team isolation
class DatabaseManager {
    constructor() {
        this.databases = new Map();
        this.masterDb = null;
    }
    
    async getTeamDatabase(teamId) {
        const dbName = `gdRecruitDB_${teamId}`;
        if (!this.databases.has(dbName)) {
            const db = await this.openDatabase(dbName);
            this.databases.set(dbName, db);
        }
        return this.databases.get(dbName);
    }
}
```

### Custom Table Cell Styling System (v0.5.0)
**Files**: `popup/popup.js`, `popup/popup.css`
- **Potential Column Styling**: Bold, color-coded text based on recruit potential values
- **Miles Column Styling**: Dynamic background color gradient based on distance thresholds
- **Color Calculation Functions**: `calculateMilesBackgroundColor()`, `getContrastTextColor()`
- **CSS Classes**: Potential value classes (potential-vh, potential-h, etc.)
- **Accessibility**: WCAG-compliant contrast ratios and readable text
- **Performance**: Efficient color calculations with minimal DOM operations

This enhanced technical context documentation reflects the current multi-team architecture with comprehensive storage isolation, automatic team switching, and robust debugging capabilities implemented in the GD Recruit Assistant browser extension.
