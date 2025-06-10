# Cookie Monitoring Implementation

## Overview
This implementation adds real-time monitoring of the "wispersisted" cookie to automatically detect when a user switches teams in the game and update the extension's UI accordingly.

## Implementation Details

### Background Script Changes (`background.js`)

#### 1. Cookie Monitoring Setup
- Added `chrome.cookies.onChanged.addListener()` to monitor wispersisted cookie changes
- Added backup periodic checking every 30 seconds as a fallback
- Tracks `lastKnownCookieValue` to detect actual changes vs. redundant events

#### 2. Cookie Change Handler
- `handleCookieChange()` function processes cookie updates
- Extracts team ID from new cookie value
- Looks up school information from GDR data
- Broadcasts team changes to all extension contexts

#### 3. Team Change Broadcasting
- `broadcastTeamChange()` sends messages to all extension contexts
- Handles both successful team changes and error states
- Uses action type 'teamChanged' for consistent message handling

#### 4. New Message Handlers
- `getCurrentTeamInfo`: Get current team information on demand
- `refreshTeamInfo`: Force refresh team information from cookies

### Sidebar Script Changes (`sidebar.js`)

#### 1. Message Listener Enhancement
- Added handler for 'teamChanged' action in existing message listener
- Calls `handleTeamChange()` when team change notifications are received

#### 2. Team Change Handler
- `handleTeamChange()` updates school name and team info displays
- Updates multiple UI elements: schoolName, dashboardSchoolName, team-division, team-world
- Handles both successful updates and error states
- Calls `updateDashboardStats()` to refresh dependent data

#### 3. Notification System
- `showNotification()` displays user-friendly notifications
- Auto-hides notifications after 3 seconds
- Supports different notification types (info, error, success, warning)

#### 4. Initialization Enhancement
- Added team info request during sidebar initialization
- Ensures UI shows correct team information on extension startup

### CSS Styles (`sidebar.css`)

#### 1. Team Information Display
- `.team-details` styles for enhanced team info presentation
- `.team-meta` styles for division, conference, and world information
- Color-coded badges for different team attributes

#### 2. Notification System Styles
- Fixed positioning notification container
- Color-coded notifications based on type
- Smooth transitions and proper z-indexing
- Responsive design for different screen sizes

## Key Features

### 1. Real-time Monitoring
- Detects cookie changes immediately using Chrome's cookie API
- Backup periodic checking prevents missed changes
- Minimal performance impact

### 2. Automatic Team Info Lookup
- Extracts team ID from cookie using regex pattern
- Cross-references with GDR data for school information
- Stores team information for offline access

### 3. UI Broadcasting
- Notifies all extension contexts of team changes
- Consistent message format across all contexts
- Error handling for edge cases

### 4. User Experience
- Visual notifications when team changes occur
- Smooth UI updates without page refresh
- Error states handled gracefully

## Error Handling

- Cookie access errors handled gracefully
- Team lookup failures provide fallback displays
- Message broadcasting failures handled silently
- Timeout protection for database operations

## Browser Compatibility

- Uses Chrome Extension Manifest V3 APIs
- Compatible with Chromium-based browsers
- Cookie permissions already configured in manifest.json

## Dependencies

- Requires existing `recruitStorage`, `getTeamInfoFromCookies`, and `extractTeamIdFromCookie` functions
- Uses existing sidebar communication system
- Relies on GDR data for team information lookup

## Testing Recommendations

1. Test cookie changes by switching teams in the game
2. Verify UI updates in sidebar when team changes occur
3. Test error handling with invalid or missing cookies
4. Confirm notifications display and auto-hide correctly
5. Validate team information accuracy against game data
