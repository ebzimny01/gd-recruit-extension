# System Patterns: GD Recruit Assistant Browser Extension

## Architecture Overview

### Extension Architecture Pattern
```
Browser Extension (Manifest V3)
├── Service Worker (background.js)
│   ├── Multi-Team Management
│   ├── Cookie Monitoring
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
- **popup.css**: Responsive styling with accessibility features and custom table cell styling
- **popup.js**: Core application logic, state management, and advanced column styling functions
- **communications.js**: Background script communication layer
- **error-handler.js**: Centralized error handling and user feedback

#### 2. Content Scripts (Page Integration)
**Location**: `content/`
- **page-detector.js**: Identifies GD recruiting pages and triggers appropriate handlers
- **scraper.js**: Main data extraction logic for recruit information
- **background-overlay.js**: UI overlays and page enhancement features

#### 3. Background Processing (Service Worker)
**Location**: `background.js`
- **Message Routing**: Handles communication between popup and content scripts
- **Team Management**: Cookie monitoring and automatic team switching
- **Data Processing**: Transforms raw scraped data into structured format
- **Multi-Team Storage**: Manages team-specific and global storage operations
- **Error Handling**: Centralized error logging and recovery

#### 4. Library Modules (Shared Logic)
**Location**: `lib/`
- **multi-team-storage.js**: Multi-team storage architecture and data management
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

### 1. Multi-Team Storage Pattern
**Implementation**: `lib/multi-team-storage.js`
```javascript
// Master database with team registry
class MultiTeamRecruitStorage {
    constructor() {
        this.MASTER_DB_NAME = 'gdRecruitDB_master';
        this.teamStorageInstances = new Map();
    }
    
    async setActiveTeam(teamId, teamInfo) {
        await this._ensureTeamRegistered(teamId, teamInfo);
        const teamStorage = await this._getTeamStorage(teamId);
        this.currentTeamId = teamId;
        this.currentTeamStorage = teamStorage;
    }
}
```

**Benefits**:
- Complete data isolation between teams
- Global configuration sharing
- Automatic team detection and switching
- Registry-based team metadata management

### 2. Message Passing Pattern
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

### 3. Cookie Monitoring Pattern
**Implementation**: Team change detection
```javascript
class TeamCookieMonitor {
    async startMonitoring() {
        setInterval(async () => {
            const currentCookie = await this.getCurrentCookie();
            if (currentCookie !== this.lastKnownCookie) {
                await this.handleTeamChange(currentCookie);
            }
        }, this.pollInterval);
    }
}
```

**Purpose**: Automatic team context switching based on user navigation

### 4. Observer Pattern for UI Updates
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

### 5. Conditional Formatting Pattern
**Implementation**: Shared logic for consistent visual formatting across related columns
```javascript
// Reusable conditional formatting logic
const getConsideringClasses = (recruit, teamInfo) => {
    const baseClasses = [];
    
    if (teamInfo && teamInfo.teamId && recruit.considering) {
        const consideringStatus = checkCurrentSchoolInConsidering(recruit.considering, teamInfo.teamId);
        
        switch (consideringStatus) {
            case 'only':
                baseClasses.push('considering-only-school');
                break;
            case 'included':
                baseClasses.push('considering-among-schools');
                break;
            case 'not_included':
                // No special formatting
                break;
        }
    }
    
    return baseClasses;
};

// Applied consistently to both Name and Considering Schools columns
```

**Purpose**: Visual consistency and DRY principle adherence for related UI elements

### 6. Command Pattern for User Actions
**Implementation**: Action-based user interaction handling
```javascript
const actions = {
    scrapeData: () => triggerScraping(),
    exportData: () => generateExport(),
    clearData: () => confirmAndClear(),
    switchTeam: (teamId) => handleTeamSwitch(teamId)
};

document.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (actions[action]) actions[action]();
});
```

### 7. Strategy Pattern for Data Processing
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

### 8. Custom Table Cell Styling Pattern (v0.5.0)
**Implementation**: Dynamic column styling in `popup/popup.js`
```javascript
// Potential column with classes function
{
    data: 'potential',
    title: 'Potential',
    classes: function(cellData, type, rowData) {
        const potentialClasses = {
            '4': 'potential-vh',    // Very High - Green
            '3': 'potential-h',     // High - Blue  
            '2': 'potential-a',     // Average - Black
            '1': 'potential-l',     // Low - Orange
            '0': 'potential-vl'     // Very Low - Red
        };
        return potentialClasses[cellData] || '';
    }
}

// Miles column with customStyle function
{
    data: 'miles',
    title: 'Miles',
    customStyle: function(cellData, type, rowData) {
        if (type === 'display' && cellData !== null && cellData !== undefined) {
            const miles = parseFloat(cellData);
            if (!isNaN(miles)) {
                const bgColor = calculateMilesBackgroundColor(miles);
                const textColor = getContrastTextColor(bgColor);
                return `<span style="background-color: ${bgColor}; color: ${textColor}; padding: 2px 4px; border-radius: 3px;">${cellData}</span>`;
            }
        }
        return cellData;
    }
}
```

### 9. Shared Component Update Pattern (v0.5.1)
**Implementation**: Multi-location component updates with shared data calculation in `popup/popup.js`
```javascript
// Shared data calculation function
function updateRecruitmentSummary() {
  try {
    let signed_count = 0;
    let green_count = 0;
    let yellow_count = 0;

    const currentTeamId = state.currentTeamId;
    
    // Data calculation logic to determine counts
    state.filtered_recruits.forEach(recruit => {
      // ... calculation logic ...
    });

    // Single function updates multiple UI locations
    updateSummaryDisplay(signed_count, green_count, yellow_count);
  } catch (error) {
    console.error('Error in updateRecruitmentSummary:', error);
    updateSummaryDisplay(0, 0, 0);
  }
}

// Single function to update multiple UI components
function updateSummaryDisplay(signedCount, greenCount, yellowCount) {
  // Update recruits tab summary
  if (elements.summary_signed) {
    elements.summary_signed.textContent = signed.toString();
    // ...more update code...
  }
  
  // Update dashboard summary with the same data
  if (elements.dashboard_summary_signed) {
    elements.dashboard_summary_signed.textContent = signed.toString();
    // ...more update code...
  }
}
```

### 10. Logical UI Element Placement Pattern (v0.5.2)
**Implementation**: Strategic component placement based on functional relationship in `popup/popup.html`
```html
<!-- Pagination controls with integrated refresh button -->
<div class="pagination-controls">
  <div class="page-size-control">
    <label for="page-size-select">Results per page</label>
    <select id="page-size-select">
      <!-- ... options ... -->
    </select>
  </div>
  <div class="refresh-button-control">
    <button id="btn-update-considering" class="action-btn compact-btn" 
      title="Refresh current recruit data from the recruiting page">
      Refresh Data
    </button>
  </div>
  <div class="recruitment-summary">
    <!-- ... summary items ... -->
  </div>
</div>
```

**Benefits**:
- UI controls positioned based on logical relationship to affected data
- Improved user workflow through intuitive component placement
- Better screen space utilization by integrating related controls
- Preserves functionality while enhancing usability
- Maintains consistent UI design language and accessibility

### 11. SIM AI Coaching Detection Pattern (v0.5.4)
**Implementation**: Strategic recruiting opportunity identification through coach analysis in `popup/popup.js`
```javascript
// Check if all schools in considering list have "SIM AI" as coach
function checkAllSchoolsHaveSimAI(considering) {
  if (!considering || considering === 'undecided') {
    return false;
  }
  
  // Split by semicolon to get individual school entries
  const schoolEntries = considering.split(';').map(entry => entry.trim()).filter(entry => entry.length > 0);
  
  // Check each school entry for "SIM AI" as coach
  for (const entry of schoolEntries) {
    // Find the last occurrence of a pattern like "XX | XX" (rankings)
    const rankingsMatch = entry.match(/, (\d+) \| (\d+)$/);
    if (!rankingsMatch) {
      return false;
    }
    
    // Remove the rankings part and parse from end
    const withoutRankings = entry.substring(0, entry.lastIndexOf(rankingsMatch[0]));
    const parts = withoutRankings.split(',').map(part => part.trim());
    
    // The coach name should be the last part (after removing rankings)
    const coachName = parts[parts.length - 1];
    if (coachName !== 'SIM AI') {
      return false;
    }
  }
  
  return true; // All schools have SIM AI as coach
}

// Applied in both Name and Considering Schools columns
classes: (() => {
  const baseClasses = [];
  
  // Check for SIM AI coaching styling (recruit not signed and all schools have SIM AI)
  if (recruit.considering && (recruit.signed !== 'Y' && recruit.signed !== 'Yes' && recruit.signed !== 1)) {
    const allSchoolsHaveSimAI = checkAllSchoolsHaveSimAI(recruit.considering);
    if (allSchoolsHaveSimAI) {
      baseClasses.push('sim-ai-schools');
    }
  }
  
  return baseClasses;
})()
```

**CSS Styling**:
```css
/* SIM AI schools formatting - for recruits not signed with all schools having SIM AI coaches */
td.sim-ai-schools {
  background-color: #e7f3ff;
  color: #004085;
  font-weight: 600;
  border: 1px solid #b8daff;
  font-style: italic;
}
```

**Benefits**:
- Strategic recruiting opportunity identification
- Immediate visual feedback for computer-controlled competition scenarios
- Robust parsing handles school names with commas (e.g., "University of Maine, Orono")
- Enhanced competitive analysis for recruiting strategy
- Professional, accessible styling for clear visual differentiation
- Applied consistently to both Name and Considering Schools columns

## Data Flow Architecture

### 1. Multi-Team Data Flow
```
Cookie Change → Team Detection → Team Registration → Storage Context Switch → UI Update
```

**Process**:
1. Background monitors wispersisted cookie for changes
2. Team change detected and new team ID extracted
3. Team registered in master database if not exists
4. Storage context switched to team-specific database
5. UI updated to reflect new team context

### 2. Data Extraction Flow
```
GD Recruiting Page → Content Script → Data Validation → Background Processing → Team Storage
```

**Process**:
1. Page detector identifies GD recruiting pages
2. Scraper extracts raw HTML data
3. Data validator ensures integrity
4. Background processor transforms to structured format
5. Team-specific storage layer persists data locally

### 3. User Interaction Flow
```
User Action → Popup Interface → Data Processing → UI Update → Team Storage Sync
```

**Process**:
1. User triggers action (filter, sort, config change)
2. Popup interface processes user input
3. Data layer applies changes with team context
4. UI updates reflect new state
5. Team-specific storage syncs changes for persistence

### 4. Configuration Management Flow
```
Default Config → User Customization → Global/Team Routing → Validation → Storage → Runtime Application
```

**Process**:
1. Load default configurations from JSON files
2. Apply user customizations if available
3. Route to global or team-specific storage based on config type
4. Validate configuration integrity
5. Store validated configuration
6. Apply configuration to runtime behavior

## Multi-Team Architecture Patterns

### 1. Master Database Pattern
**Implementation**: Central team registry
```javascript
// Master database structure
const masterDatabase = {
    teams: {
        [teamId]: {
            teamId: 'string',
            schoolName: 'string',
            division: 'string',
            world: 'string',
            firstSeen: 'timestamp',
            lastAccessed: 'timestamp'
        }
    },
    globalConfig: {
        roleRatings: 'object',
        boldAttributes: 'object',
        columnVisibility: 'object'
    }
};
```

### 2. Team-Specific Database Pattern
**Implementation**: Isolated team data
```javascript
// Team database structure
const teamDatabase = {
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
};
```

### 3. Storage Routing Pattern
**Implementation**: Configuration type-based routing
```javascript
// Smart configuration routing
const TEAM_SPECIFIC_CONFIG_KEYS = [
    'currentSeason', 'lastUpdated', 'recruitCount', 
    'watchlistCount', 'teamInfo'
];

const GLOBAL_CONFIG_KEYS = [
    'roleRatings', 'boldAttributes', 'columnVisibility'
];

function routeConfigStorage(key, value) {
    if (TEAM_SPECIFIC_CONFIG_KEYS.includes(key)) {
        return currentTeamStorage.saveTeamMetadata(key, value);
    } else if (GLOBAL_CONFIG_KEYS.includes(key)) {
        return masterStorage.saveGlobalConfig(key, value);
    }
}
```

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

### 3. Team Storage Caching
**Implementation**: Cache team storage instances
```javascript
class MultiTeamStorage {
    constructor() {
        this.teamStorageInstances = new Map();
    }
    
    async _getTeamStorage(teamId) {
        if (this.teamStorageInstances.has(teamId)) {
            return this.teamStorageInstances.get(teamId);
        }
        
        const teamStorage = new TeamSpecificStorage(teamId);
        await teamStorage.initialize();
        this.teamStorageInstances.set(teamId, teamStorage);
        return teamStorage;
    }
}
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

### 2. Team Context Error Recovery
**Implementation**: Graceful team switching failures
```javascript
async function handleTeamSwitchError(teamId, error) {
    console.warn(`Team switch to ${teamId} failed:`, error);
    
    // Attempt fallback recovery
    try {
        await fallbackTeamInitialization(teamId);
    } catch (fallbackError) {
        // Graceful degradation
        showUserMessage('Team context unavailable, using default settings');
        useDefaultTeamContext();
    }
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
    validateBusinessRules,
    validateTeamContext
];

function validateData(data, teamId) {
    return validators.every(validator => validator(data, teamId));
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

### 2. Team Data Isolation
**Implementation**: Prevent cross-team data access
```javascript
class TeamSpecificStorage {
    constructor(dbName, teamId) {
        this.teamId = teamId;
        this.DB_NAME = `gdRecruitDB_${teamId}`;
        // Each team gets isolated database
    }
    
    validateTeamAccess(requestedTeamId) {
        if (requestedTeamId !== this.teamId) {
            throw new Error('Unauthorized team data access');
        }
    }
}
```

### 3. Content Security Policy
**Implementation**: CSP headers in manifest
```json
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'"
    }
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

### 1. Multi-Team Testing
**Implementation**: Team isolation validation
```javascript
// Test team data isolation
async function testTeamDataIsolation() {
    await multiTeamStorage.setActiveTeam('team1');
    await multiTeamStorage.saveRecruit(recruit1);
    
    await multiTeamStorage.setActiveTeam('team2');
    const team2Recruits = await multiTeamStorage.getAllRecruits();
    
    assert(team2Recruits.length === 0); // Should be empty
}
```

### 2. Integration Testing
**Implementation**: End-to-end multi-team workflow validation
```javascript
// Test complete multi-team workflows
async function testMultiTeamWorkflow() {
    // Test team switching
    await simulateTeamSwitch('team1');
    await scrapeTestData();
    
    await simulateTeamSwitch('team2');
    const team1Data = await getTeamData('team1');
    const team2Data = await getTeamData('team2');
    
    assert(team1Data !== team2Data); // Data should be isolated
}
```

### 3. Performance Testing
**Implementation**: Multi-team load validation
```javascript
// Performance benchmarks for multi-team operations
function benchmarkTeamSwitching() {
    const startTime = performance.now();
    
    return Promise.all([
        switchToTeam('team1'),
        switchToTeam('team2'),
        switchToTeam('team3')
    ]).then(() => {
        const endTime = performance.now();
        assert(endTime - startTime < 3000); // Under 3 seconds for 3 teams
    });
}
```

## Debugging Patterns

### 1. Comprehensive Debug Logging
**Implementation**: Multi-team debug system
```javascript
// Enhanced debug logging for multi-team operations
class DebugLogger {
    static logTeamOperation(operation, teamId, data) {
        console.log(`🔍 DEBUG: ${operation} for team ${teamId}:`, data);
    }
    
    static logDataFlow(from, to, data) {
        console.log(`🔍 DEBUG: Data flow ${from} → ${to}:`, data);
    }
}
```

### 2. Team Context Tracking
**Implementation**: Current team state monitoring
```javascript
// Track team context changes
function trackTeamContext() {
    const observer = new MutationObserver(() => {
        const currentTeam = getCurrentTeamId();
        console.log(`🔍 DEBUG: Team context: ${currentTeam}`);
    });
    
    observer.observe(document.body, { subtree: true, childList: true });
}
```

This updated system patterns documentation reflects the current multi-team architecture with proper data isolation, automatic team switching, and comprehensive debugging capabilities implemented in the GD Recruit Assistant browser extension.
