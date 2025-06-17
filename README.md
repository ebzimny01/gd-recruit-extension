# GD Recruit Assistant Browser Extension

A comprehensive browser extension for Gridiron Dynasty recruiting management, featuring advanced data visualization, filtering, and management capabilities.

## 🎯 Overview

The GD Recruit Assistant transforms the Gridiron Dynasty recruiting experience by providing:
- **Comprehensive Data Management**: Import, export, and organize recruit data
- **Advanced Filtering**: Multi-criteria filtering with real-time updates
- **Visual Enhancements**: Enhanced tables with tooltips, sorting, and highlighting
- **Customizable Interface**: Configurable columns, bold attributes, and role ratings
- **Accessibility**: Full keyboard navigation and screen reader support

## ✨ Key Features

### 📊 Dashboard
- **Real-time Statistics**: Recruit counts, watchlist status, and team information
- **Quick Actions**: One-click data scraping and updates
- **Status Monitoring**: Current season tracking and data freshness indicators

### 👥 Recruit Management
- **Advanced Filtering**: Filter by position, potential, division, priority, distance, and more
- **Smart Pagination**: Configurable page sizes with "show all" option
- **Enhanced Display**: Color-coded rows, tooltips, and status indicators
- **Bulk Operations**: Export/import functionality with full data preservation

### ⚙️ Configuration
- **Role Ratings**: Customize position-specific attribute weights
- **Bold Attributes**: Highlight important attributes by position
- **Column Visibility**: Show/hide table columns based on preferences
- **Data Management**: Clear, refresh, and backup data with ease

### 🎨 User Experience
- **Full-Screen Interface**: Opens as a browser tab for maximum visibility
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Keyboard Shortcuts**: Ctrl+1/2/3 for tabs, Ctrl+F for filters, arrow keys for navigation
- **Accessibility**: WCAG 2.1 AA compliant with screen reader support

## 🚀 Installation

### From Source
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
1. **Navigate to GD Recruiting**: Go to your Gridiron Dynasty recruiting pages
2. **Open Extension**: Click the extension icon to open the management interface
3. **Initial Setup**: Set your current season in the dashboard
4. **Scrape Data**: Use "Scrape Recruits" to import your recruiting data

### Dashboard Tab
- **View Statistics**: See recruit counts, watchlist status, and team info
- **Quick Actions**: Scrape new data or update considering schools
- **Monitor Status**: Check data freshness and current season

### Recruits Tab
- **Apply Filters**: Use the filter section to narrow down recruits
- **Sort Data**: Click column headers to sort by different criteria
- **Navigate Results**: Use pagination controls or "Show All" for large datasets
- **View Details**: Hover over cells for detailed tooltips

### Settings Tab
- **Role Ratings**: Configure position-specific attribute importance
- **Bold Attributes**: Set which attributes to highlight for each position
- **Column Visibility**: Customize which table columns are displayed
- **Data Management**: Export, import, clear, or refresh your data

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
│   └── office-page-handler.js
├── modules/              # Reusable modules
│   └── bold-attributes-config.js
├── lib/                  # Utility libraries
│   ├── calculator.js     # Role rating calculations
│   ├── storage.js        # Data persistence
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
- `Arrow Keys`: Navigate table rows

### Data Export/Import
- **JSON Format**: Complete data preservation including settings
- **Metadata Included**: Export date, version, and record counts
- **Settings Backup**: Role ratings and configuration included
- **Cross-Season**: Import data across different seasons

### Accessibility Features
- **Screen Reader Support**: Full ARIA compliance
- **Keyboard Navigation**: Complete functionality without mouse
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
- Ensure Developer Mode is enabled in Chrome
- Check browser console for error messages
- Verify all files are present in extension directory

**Data Not Scraping**
- Confirm you're on a Gridiron Dynasty recruiting page
- Check that the page has loaded completely
- Verify browser permissions for the extension

**Performance Issues**
- Large datasets (>1000 recruits) may take time to load
- Use pagination instead of "Show All" for better performance
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
