# GD Recruit Assistant Browser Extension

A comprehensive browser extension for Gridiron Dynasty recruiting management, featuring advanced data visualization, filtering, and management capabilities.

Using the extension? See the [User Guide](docs/USER_GUIDE.md).

## 🎯 Overview

The GD Recruit Assistant transforms the Gridiron Dynasty recruiting experience by providing:
- **Comprehensive Data Management**: Load, export, and organize recruit data
- **Advanced Filtering**: Multi-criteria filtering with real-time updates
- **Visual Enhancements**: Enhanced tables with tooltips, sorting, and highlighting
- **Customizable Interface**: Configurable columns, bold attributes, and role ratings
- **Accessibility**: Keyboard shortcuts and screen reader support

## ✨ Key Features

### 📊 Dashboard
- **Real-time Statistics**: Recruit counts, watchlist status, and team information
- **Quick Actions**: One-click season setup and team sync
- **Status Monitoring**: Current season tracking and data freshness indicators

### 👥 Recruit Management
- **Advanced Filtering**: Filter by position, potential, division, priority, distance (with custom ranges), and more
- **Smart Pagination**: Configurable page sizes (10, 25, 50, or 100 results)
- **Enhanced Display**: Color-coded rows, tooltips, and status indicators
- **CSV Export**: Export recruit data for use in a spreadsheet
- **Team Synchronization**: Manual team sync for reliable team detection and switching

### ⚙️ Configuration
- **Role Ratings**: Customize position-specific attribute weights
- **Bold Attributes**: Highlight important attributes by position
- **Column Visibility**: Show/hide table columns based on preferences
- **Data Management**: Clear, refresh, and export data with ease

### 🎨 User Experience
- **Full-Screen Interface**: Opens as a browser tab for maximum visibility
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Keyboard Shortcuts**: Ctrl+1/2/3 for tabs, Ctrl+F for filters
- **Accessibility**: Screen reader labels, high contrast, and reduced motion support

## 🚀 Installation

Install [GD Recruit Assistant from the Chrome Web Store](https://chromewebstore.google.com/detail/ngoneggcfpeebpmmicndaflpmghjikfh). Chrome keeps it up to date automatically.

### From Source (for developers)
1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd gd-recruit-extension
   ```

2. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory
   - The extension icon will appear in your browser toolbar

3. **Verify Installation**:
   - Click the extension icon to open the interface
   - Navigate to a Gridiron Dynasty recruiting page
   - The extension should detect the page and enable scraping features

## 🛠️ Usage

### Getting Started
1. **Log In**: Log in to WhatIfSports and open your team in Gridiron Dynasty
2. **Open Extension**: Click the extension icon to open the management interface
3. **Team Detection**: Use the "Sync Active Team" button if your team isn't detected automatically
4. **Load Recruits**: Use "Initialize Season" to enter the season number, choose divisions, and load your recruits

See the [User Guide](docs/USER_GUIDE.md) for full instructions.

### Dashboard Tab
- **View Statistics**: See recruit counts, watchlist status, and team info
- **Quick Actions**: Initialize a season or sync the active team
- **Monitor Status**: Check data freshness and current season
- **Team Management**: Manual team sync for reliable multi-team support

### Recruits Tab
- **Apply Filters**: Use the filter section to narrow down recruits (includes custom distance ranges)
- **Sort Data**: Click column headers to sort by different criteria
- **Navigate Results**: Use the pagination controls and page size selector
- **Customize Columns**: Reorder columns by dragging headers, and show or hide them
- **Refresh Data**: Update watched, potential, priority, signed, and considering data
- **View Details**: Hover over cells for detailed tooltips

### Settings Tab
- **Role Ratings**: Configure position-specific attribute importance
- **Bold Attributes**: Set which attributes to highlight for each position
- **Data Management**: Export to CSV or clear your data

## 🔧 Technical Details

### Architecture
```
📁 Extension Structure
├── manifest.json          # Extension configuration
├── background.js          # Service worker for data processing
├── popup/                 # Main application interface
│   ├── popup.html        # User interface structure
│   ├── popup.css         # Responsive styling
│   ├── popup.js          # Core application logic
│   └── communications.js # Background communication
├── content/              # Page-specific scripts
│   ├── page-detector.js  # Page type detection
│   ├── scraper.js        # Data extraction
│   └── background-overlay.js # UI overlay enhancements
├── modules/              # Reusable modules
│   └── bold-attributes-config.js
├── lib/                  # Utility libraries
│   ├── calculator.js     # Role rating calculations
│   ├── multi-team-storage.js # Data persistence
│   ├── debug-tools.js    # Debugging utilities
│   └── version.js        # Version management
└── data/                 # Default configurations
    ├── role_ratings_defaults.json
    └── bold_attributes_defaults.json
```

### Performance Features
- **Virtual Scrolling**: Handles large datasets efficiently
- **Result Caching**: Avoids redundant filter operations
- **Batch Rendering**: Prevents UI blocking during heavy operations
- **Debounced Updates**: Optimizes real-time filtering

### Browser Compatibility
- **Chrome 88+**: Full feature support
- **Edge 88+**: Full support via Chromium
- **Firefox 89+**: Compatible with minor modifications
- **Mobile Browsers**: Responsive design support

## 🎯 Advanced Features

### Keyboard Shortcuts
- `Ctrl/Cmd + 1`: Switch to Dashboard tab
- `Ctrl/Cmd + 2`: Switch to Recruits tab  
- `Ctrl/Cmd + 3`: Switch to Settings tab
- `Ctrl/Cmd + F`: Focus filter controls
- `Escape`: Close open modals

### Data Export
- **CSV Format**: Exports every recruit and column for the active team
- **Spreadsheet Use**: Export is not a backup, because the extension cannot import the file

### Accessibility Features
- **Screen Reader Support**: ARIA labels on recruit table rows
- **Keyboard Navigation**: Shortcuts for tabs and filters, and sortable column headers
- **High Contrast**: Supports high contrast display modes
- **Reduced Motion**: Respects motion sensitivity preferences
- **Focus Management**: Clear focus indicators and logical tab order

## 🔒 Privacy & Security

### Data Handling
- **Local Storage Only**: All data stored locally in browser
- **No External Transmission**: No data sent to external servers
- **Minimal Permissions**: Only requests necessary browser permissions
- **User Control**: Complete control over data export and deletion

### Security Features
- **Input Validation**: All user inputs sanitized and validated
- **XSS Prevention**: Safe DOM manipulation practices
- **CSP Compliance**: Content Security Policy adherent
- **Permission Principle**: Least privilege access model

## 🐛 Troubleshooting

### Common Issues

**Extension Not Loading**
- If you loaded it from source, ensure Developer Mode is enabled in Chrome
- Check browser console for error messages
- Verify all files are present in extension directory

**Data Not Scraping**
- Confirm you're on a Gridiron Dynasty recruiting page
- Check that the page has loaded completely
- Verify browser permissions for the extension
- Try the "Sync Active Team" button to refresh team detection

**Performance Issues**
- Large datasets (>1000 recruits) may take time to load
- Use a smaller page size for better performance
- Clear browser cache if extension becomes sluggish

**Display Issues**
- Ensure browser zoom is at 100%
- Check for conflicting browser extensions
- Try refreshing the extension page

### Getting Help
1. Check browser console for error messages
2. Verify extension permissions in browser settings
3. Try disabling other extensions temporarily
4. Refresh the extension page or restart browser

## 🔧 Development

### Setup Development Environment
```bash
# Clone repository
git clone [repository-url]
cd gd-recruit-extension

# Load in browser
# Open chrome://extensions/, enable Developer Mode, click "Load unpacked"

# Make changes and reload extension as needed
```

### Code Standards
- **ES6+ JavaScript**: Modern JavaScript features
- **Modular Architecture**: Clear separation of concerns
- **Comprehensive Comments**: JSDoc-style documentation
- **Error Handling**: Robust try-catch patterns
- **Performance First**: Optimization-focused development

### Testing
- **Manual Testing**: Comprehensive user workflow testing
- **Performance Testing**: Large dataset performance validation
- **Accessibility Testing**: Screen reader and keyboard testing
- **Cross-Browser Testing**: Chrome, Edge, and Firefox compatibility

## 📋 Changelog

### Version 0.6.0 (Latest)
- ✅ Fixed CSV parsing for school names with commas
- ✅ Added a packaging script for the Chrome extension

### Version 0.5.8
- ✅ Enhanced distance filtering with 10 preset ranges (100-2500 miles)
- ✅ Custom distance input for precise filtering control
- ✅ Manual team sync functionality for reliable team detection
- ✅ Improved team switching architecture with cookie monitoring fixes
- ✅ Enhanced startup team detection with proactive cookie checking
- ✅ Stacked distance filter layout preventing UI overlap issues
- ✅ Fixed column sorting preservation when applying filters

### Version 0.2.0
- ✅ Complete migration from sidebar to full-screen tab interface
- ✅ Enhanced recruits table with tooltips and visual indicators
- ✅ Bold attributes configuration with live preview
- ✅ Role ratings customization with tabbed interface
- ✅ Export/import functionality with full data preservation
- ✅ Comprehensive keyboard accessibility
- ✅ Performance optimizations for large datasets
- ✅ Responsive design for mobile and tablet support

### Version 0.1.0
- Initial sidebar-based implementation
- Basic recruit data scraping
- Simple filtering and pagination
- Column visibility controls
- Basic settings management

## 📄 License

See the [LICENSE](LICENSE) file for license terms.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines
1. Follow existing code style and patterns
2. Add comprehensive comments for new functions
3. Test thoroughly across different browsers
4. Ensure accessibility compliance
5. Update documentation for new features

---

**Built with ❤️ for the Gridiron Dynasty community**

*Streamline your recruiting, maximize your success!*
