# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension for Gridiron Dynasty recruiting management. The extension provides comprehensive data management, advanced filtering, and enhanced visualization for football recruiting workflows. It features a multi-team architecture with automatic team switching based on cookie detection.

## Development Setup

### Loading the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory
4. The extension icon will appear in your browser toolbar

### Testing the Extension
1. Navigate to Gridiron Dynasty recruiting pages (`https://*.whatifsports.com/gd/recruiting/*`)
2. Click the extension icon to open the management interface
3. Use "Scrape Recruits" to test data extraction functionality
4. Test multi-team switching by switching teams in Gridiron Dynasty

## Architecture Overview

### Extension Structure (Manifest V3)
- **manifest.json**: Extension configuration with Manifest V3 specifications
- **background.js**: Service worker handling multi-team management, cookie monitoring, and data processing
- **popup/**: Full-screen tab interface with HTML, CSS, JS, and communications modules
- **content/**: Page integration scripts for detection, scraping, and overlays
- **lib/**: Shared utilities including multi-team storage architecture
- **data/**: Configuration defaults for role ratings and bold attributes

### Multi-Team Architecture
The extension uses a sophisticated multi-team storage system:
- **Master Database** (`gdRecruitDB_master`): Team registry and global configurations
- **Team-Specific Databases** (`gdRecruitDB_[teamId]`): Isolated data per team
- **Automatic Team Detection**: Cookie monitoring for seamless team switching
- **Storage Routing**: Smart routing between global and team-specific configurations

### Key Components
- **MultiTeamRecruitStorage** (`lib/multi-team-storage.js`): Core storage architecture
- **TeamCookieMonitor** (`background.js`): Real-time team change detection
- **ErrorHandler** (`popup/error-handler.js`): Centralized error management
- **DebugTools** (`lib/debug-tools.js`): Development and debugging utilities

## Data Flow

### Team Switching Flow
1. Background service worker monitors `wispersisted` cookie changes
2. Team change detection triggers team registration in master database
3. Storage context switches to team-specific database
4. UI updates to reflect new team context

### Data Extraction Flow
1. Content scripts detect Gridiron Dynasty recruiting pages
2. Scraper extracts recruit data from HTML
3. Background processes and validates data
4. Data stored in team-specific database with isolation guarantees

## Key Patterns

### Storage Pattern
- Global configurations (role ratings, bold attributes) shared across teams
- Team-specific data (recruits, season info) isolated per team
- Instance caching for performance optimization
- LRU cache management for team storage instances

### UI Patterns
- Custom table cell styling with dynamic color coding
- Conditional formatting based on data values
- Shared component updates across multiple UI locations
- Logical element placement based on functional relationships

### Performance Patterns
- Virtual scrolling for large datasets (1000+ recruits)
- Debounced filter operations (300ms delay)
- Batch DOM operations to minimize reflows
- Result caching with team-aware cache keys

## Configuration Management

### Global Configurations (Shared Across Teams)
- Role ratings: Position-specific attribute weights
- Bold attributes: Highlighting rules by position
- Column visibility: Table display preferences

### Team-Specific Configurations
- Current season information
- Last updated timestamps
- Recruit and watchlist counts
- Team metadata and information

## Development Commands

This is a pure browser extension project with no build tools or package managers. Development workflow:

1. **Load Extension**: Use Chrome's developer mode to load unpacked extension
2. **Reload Extension**: Click reload button in `chrome://extensions/` after changes
3. **Debug**: Use browser DevTools for popup, background page, and content scripts
4. **Test**: Manual testing across different Gridiron Dynasty pages and team contexts

## Testing Strategy

### Multi-Team Testing
- Verify data isolation between teams
- Test automatic team switching functionality
- Validate team-specific storage operations
- Check global configuration sharing

### Performance Testing
- Large dataset handling (1000+ recruits per team)
- Team switching response time (<1 second)
- Filter operations response time (<500ms)
- Memory usage across multiple teams

### Accessibility Testing
- Keyboard navigation (Ctrl+1/2/3 for tabs, Ctrl+F for filters)
- Screen reader compatibility with team context announcements
- High contrast mode support
- Focus management and ARIA implementation

## Security Considerations

- **Local Storage Only**: No external data transmission
- **Input Sanitization**: XSS prevention for all user inputs
- **Team Data Isolation**: Strict separation between team databases
- **Content Security Policy**: CSP compliance in manifest
- **Minimal Permissions**: Only required browser permissions

## File Structure Highlights

### Core Files
- `manifest.json`: Extension configuration and permissions
- `background.js`: Multi-team service worker with cookie monitoring
- `popup/popup.js`: Main application logic with advanced styling functions
- `lib/multi-team-storage.js`: Multi-team storage architecture

### Key Directories
- `popup/`: Full-screen interface components
- `content/`: Page integration and scraping scripts
- `lib/`: Shared utilities and storage management
- `data/`: Configuration defaults and reference data
- `memory-bank/`: Development documentation and context

## Common Development Tasks

### Adding New Team-Specific Features
1. Determine if data should be team-specific or global
2. Use appropriate storage routing in `multi-team-storage.js`
3. Update UI to reflect team context
4. Test with multiple teams to ensure isolation

### Modifying Data Extraction
1. Update content scripts in `content/` directory
2. Modify background processing in `background.js`
3. Ensure team context is preserved in scraped data
4. Test across different recruiting page types

### UI Enhancements
1. Follow existing styling patterns in `popup/popup.css`
2. Use conditional formatting functions for dynamic styling
3. Ensure accessibility compliance with ARIA labels
4. Test responsive design across screen sizes

## Debugging

### Multi-Team Debug Logging
The extension includes comprehensive debug logging for multi-team operations:
- Team switching events and duration tracking
- Storage operation logging with team context
- Data flow tracking between components
- Performance monitoring for team-specific operations

### Chrome DevTools Usage
- **Popup Interface**: Right-click extension icon → Inspect popup
- **Background Script**: `chrome://extensions/` → Background page link
- **Content Scripts**: Use page DevTools, scripts appear under extension ID
- **Storage**: Application tab → Storage → IndexedDB (multiple databases)

## Browser Compatibility

- **Chrome 88+**: Full feature support (primary target)
- **Edge 88+**: Full compatibility via Chromium
- **Firefox 89+**: Compatible with minor IndexedDB usage modifications
- **Mobile Browsers**: Responsive design support

## Performance Targets

- Initial load: <2 seconds
- Filter response: <500ms
- Team switching: <1 second
- Data processing: <1 second for 1000+ recruits
- UI updates: <100ms
- Multi-team data load: <3 seconds for multiple teams