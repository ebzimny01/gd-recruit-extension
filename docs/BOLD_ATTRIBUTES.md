# Bold Attributes Configuration System

## Overview

The Bold Attributes Configuration System allows users to customize which player attributes are visually emphasized (bolded) in the recruit table based on the player's position. This feature helps users quickly identify the most important attributes for each position type.

## Features

### 🎯 Position-Based Styling
- Different styling rules for each position (QB, RB, WR, TE, OL, DL, LB, DB, K, P)
- Visual emphasis through bold text and background highlighting
- Contextual importance based on football position requirements

### 🔧 User Customization
- Interactive modal interface for configuration
- Real-time preview of styling changes
- Per-position customization with granular control
- Reset individual positions or all positions to defaults

### 💾 Persistent Storage
- User preferences saved to browser storage
- Automatic merging of defaults with user customizations
- Configuration survives browser restarts and extension updates

### 🎨 Visual Design
- Clean, intuitive interface following modern design principles
- Hover effects and interactive feedback
- Responsive design for different screen sizes
- Accessibility considerations with proper focus management

## Architecture

### Core Components

1. **BoldAttributesConfig Class** (`modules/bold-attributes-config.js`)
   - Singleton pattern for centralized configuration management
   - Handles loading defaults, user preferences, and merging
   - Provides API for querying and updating configurations

2. **UI Components** (`sidebar/sidebar.html`, `sidebar/sidebar.css`)
   - Settings buttons for accessing configuration
   - Modal interface for editing preferences
   - Preview system for visualizing changes

3. **Integration Layer** (`sidebar/sidebar.js`)
   - Event handlers for user interactions
   - Integration with recruit table rendering
   - Status messaging and error handling

### Data Flow

```
Default Config (JSON) → Configuration Manager → User Storage
                                ↓
                        Merged Configuration
                                ↓
                        Recruit Table Rendering
```

## Configuration Structure

### Default Configuration File
```json
{
  "metadata": {
    "description": "Default bold attributes configuration for player positions",
    "version": "1.0.0",
    "lastUpdated": "2025-06-01"
  },
  "attributes": [
    "ath", "spd", "dur", "we", "sta", "str", "blk", "tkl", "han", "gi", "elu", "tec"
  ],
  "positions": {
    "qb": {
      "name": "Quarterback",
      "boldAttributes": {
        "ath": 0, "spd": 0, "dur": 0, "we": 0, "sta": 0,
        "str": 1, "blk": 0, "tkl": 0, "han": 0, "gi": 1,
        "elu": 0, "tec": 1
      }
    }
    // ... other positions
  }
}
```

### User Configuration Storage
User customizations are stored as JSON in browser storage under the key `boldAttributesCustomConfig`:

```json
{
  "qb": {
    "spd": 1,
    "ath": 1
  },
  "rb": {
    "dur": 1
  }
}
```

## API Reference

### BoldAttributesConfig Class

#### Methods

##### `async init()`
Initializes the configuration system by loading defaults and user preferences.

##### `shouldBoldAttribute(position, attribute)`
- **Parameters:**
  - `position` (string): Position key (e.g., 'qb', 'rb')
  - `attribute` (string): Attribute key (e.g., 'str', 'spd')
- **Returns:** boolean - Whether the attribute should be bold for the position

##### `updatePositionConfig(position, attributeConfig)`
- **Parameters:**
  - `position` (string): Position key
  - `attributeConfig` (object): Object with attribute keys and boolean values
- **Description:** Updates user configuration for a specific position

##### `resetPositionToDefault(position)`
- **Parameters:**
  - `position` (string): Position key to reset
- **Description:** Resets a position to its default configuration

##### `getAvailablePositions()`
- **Returns:** Array of position objects with key, name, and boldAttributes

##### `getAvailableAttributes()`
- **Returns:** Array of attribute strings

##### `getConfigStats()`
- **Returns:** Object with configuration statistics for debugging

## Usage Examples

### Basic Usage in Table Rendering
```javascript
// Check if an attribute should be bold for a position
if (boldAttributesConfig.shouldBoldAttribute('qb', 'str')) {
  cell.classList.add('recruit-attribute-bold');
}
```

### Programmatic Configuration Update
```javascript
// Update multiple attributes for a position
boldAttributesConfig.updatePositionConfig('qb', {
  spd: 1,
  ath: 1,
  dur: 0
});

// Save changes to storage
await boldAttributesConfig.saveUserConfig();
```

### Opening Configuration Modal
```javascript
try {
  await showBoldAttributesModal();
  console.log('Configuration saved successfully');
} catch (error) {
  console.log('Configuration cancelled or failed:', error.message);
}
```

## CSS Classes

### Applied Styles
- `.recruit-attribute-bold`: Main styling class for emphasized attributes
- `.recruit-attribute-bold:hover`: Hover state enhancement

### Modal Styles
- `.bold-attributes-modal-content`: Modal container
- `.position-selector`: Position dropdown section
- `.attributes-grid`: Grid layout for attribute checkboxes
- `.attribute-checkbox`: Individual checkbox containers
- `.attribute-checkbox.checked`: Checked state styling
- `.preview-section`: Preview area styling
- `.preview-attribute`: Individual preview elements
- `.preview-attribute.bold`: Bold preview styling

## Error Handling

### Graceful Degradation
- Extension continues to function if configuration fails to load
- Fallback configuration provided for essential functionality
- User feedback through status messages for all operations

### Error Types
1. **Initialization Errors**: Default config file not found or invalid
2. **Storage Errors**: Failed to save/load user preferences
3. **Validation Errors**: Invalid position or attribute values

### Recovery Mechanisms
- Automatic fallback to default configuration
- User notification of configuration issues
- Reset functionality to restore working state

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Configuration loaded only when needed
2. **Caching**: Merged configuration cached in memory
3. **Minimal DOM Updates**: Only affected table cells updated
4. **Event Delegation**: Efficient event handling for large tables

### Memory Management
- Singleton pattern prevents multiple instances
- Event listeners properly cleaned up in modal
- Configuration objects shared rather than duplicated

## Security Considerations

### Data Validation
- Input sanitization for all user configuration data
- Type checking for configuration values
- Boundary validation for position and attribute keys

### Storage Security
- Configuration data stored in extension's isolated storage
- No sensitive data exposed to web pages
- Proper error handling prevents data corruption

## Browser Compatibility

### Supported Browsers
- Chrome/Chromium-based browsers (primary target)
- Firefox (with manifest v3 compatibility)
- Edge (Chromium-based)

### Extension API Usage
- chrome.runtime.sendMessage for background communication
- chrome.storage for persistent configuration storage
- Standard DOM APIs for UI interactions

## Testing

### Test Coverage
1. Configuration initialization
2. Position and attribute queries
3. User configuration updates
4. Reset functionality
5. Error handling scenarios
6. Storage operations

### Manual Testing Checklist
- [ ] Modal opens and displays correctly
- [ ] Position selection updates attribute grid
- [ ] Checkbox interactions work properly
- [ ] Preview updates reflect changes
- [ ] Save operation persists configuration
- [ ] Reset functionality works as expected
- [ ] Table styling updates after configuration changes
- [ ] Error messages display for failed operations

## Maintenance

### Configuration Updates
To add new positions or attributes:
1. Update `bold_attributes_defaults.json`
2. Update `available_attributes` array if needed
3. Test with existing user configurations
4. Update documentation

### Version Migration
- Configuration versioning in metadata
- Migration scripts for breaking changes
- Backward compatibility considerations

## Troubleshooting

### Common Issues

1. **Configuration Not Loading**
   - Check browser console for errors
   - Verify default config file exists and is valid JSON
   - Try resetting to defaults

2. **Styling Not Applied**
   - Ensure boldAttributesConfig is initialized
   - Check if position/attribute values are valid
   - Verify CSS classes are properly defined

3. **Modal Not Opening**
   - Check for JavaScript errors in console
   - Verify all required DOM elements exist
   - Ensure proper event listener setup

### Debug Information
Use `boldAttributesConfig.getConfigStats()` to get debugging information:
- Initialization status
- Number of positions and attributes
- User customization status

## Future Enhancements

### Planned Features
1. **Import/Export Configuration**: Allow users to share configurations
2. **Predefined Schemes**: Pre-built configuration sets for different strategies
3. **Color Coding**: Additional visual emphasis options beyond bold
4. **Position Groups**: Apply styling to position groups (offense/defense)
5. **Contextual Suggestions**: AI-powered attribute importance recommendations

### Extension Points
- Plugin system for custom styling rules
- API for third-party configuration management
- Integration with other extension features
