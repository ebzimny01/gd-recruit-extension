# Role Ratings Implementation - Testing Guide

## Overview

This document provides a comprehensive guide for testing the role ratings functionality of the GD Recruit Extension. The implementation allows users to customize rating formulas for different football position roles and automatically calculate role-specific ratings for recruits.

## ✅ Implementation Status

### Completed Components

1. **Calculator Module** (`lib/calculator.js`)
   - ✅ Complete role ratings calculation engine
   - ✅ Data loading from JSON and storage integration
   - ✅ Custom ratings persistence and management
   - ✅ Position mapping and format conversion
   - ✅ Comprehensive error handling and validation

2. **Background Script** (`background.js`)
   - ✅ Message handlers for role ratings operations
   - ✅ Automatic calculation on recruit save
   - ✅ Integration with storage system

3. **Data Structure** (`data/role_ratings_defaults.json`)
   - ✅ Complete default role definitions for all positions
   - ✅ Structured format with metadata and utilities
   - ✅ 6 roles per position with balanced attribute weights

4. **UI Components** (`sidebar/sidebar.html`, `sidebar/sidebar.css`, `sidebar/sidebar.js`)
   - ✅ Role ratings configuration modal
   - ✅ Interactive sliders for weight adjustment
   - ✅ Real-time validation and feedback
   - ✅ Reset and save functionality

5. **Manifest Updates** (`manifest.json`)
   - ✅ Web accessible resources configured
   - ✅ Proper permissions and file inclusions

## 🧪 Testing Procedure

### Phase 1: Extension Loading Test

1. **Load Extension in Browser**
   ```
   1. Open Chrome/Edge Developer Mode
   2. Click "Load unpacked"
   3. Select the gd-recruit-extension folder
   4. Verify no errors in extension console
   ```

2. **Verify File Structure**
   ```
   ✅ manifest.json includes role_ratings_defaults.json
   ✅ All sidebar files present and accessible
   ✅ Calculator module loads without errors
   ```

### Phase 2: Core Functionality Test

1. **Navigate to Gridiron Dynasty Recruiting**
   ```
   1. Go to https://whatifsports.com/gd/recruiting/
   2. Open extension sidebar (should be available)
   3. Verify sidebar loads without errors
   ```

2. **Test Role Ratings Loading**
   ```javascript
   // Open browser console and run:
   await calculator.loadRoleRatings()
   // Should return object with QB, RB, WR, etc. positions
   ```

3. **Test Calculation for Sample Recruit**
   ```javascript
   // Test with sample data:
   const testRecruit = {
     id: 'test-123',
     pos: 'QB',
     ath: 75, spd: 70, dur: 80, we: 85, sta: 75, str: 85,
     blk: 30, tkl: 35, han: 60, gi: 90, elu: 65, tec: 88
   };
   
   const ratings = await calculator.calculateRoleRating(testRecruit);
   console.log(ratings); // Should show r1-r6 with numeric values
   ```

### Phase 3: UI Configuration Test

1. **Access Role Ratings Modal**
   ```
   1. Open sidebar Settings tab
   2. Click "Configure Role Ratings" button
   3. Verify modal opens with:
      - Position selector dropdown
      - Current role display
      - Attribute sliders
      - Action buttons
   ```

2. **Test Role Selection and Sliders**
   ```
   1. Select different positions from dropdown
   2. Verify sliders update with correct weights
   3. Test slider movement updates total
   4. Verify total validation (green/red indicators)
   ```

3. **Test Customization and Persistence**
   ```
   1. Modify attribute weights for a position
   2. Save changes
   3. Reload extension/page
   4. Verify custom weights persist
   5. Test reset functionality
   ```

### Phase 4: Integration Test

1. **Test with Real Recruit Data**
   ```
   1. Scrape some recruits from GD recruiting pages
   2. Verify role ratings are calculated automatically
   3. Check that ratings appear in recruit data
   4. Test different positions (QB, RB, WR, etc.)
   ```

2. **Test Bulk Recalculation**
   ```
   1. Load multiple recruits
   2. Modify role ratings configuration
   3. Trigger recalculation from modal
   4. Verify all recruits get updated ratings
   ```

## 🔍 Expected Behavior

### Default Role Ratings Structure

Each position has 6 roles with specific focus:

**Quarterback (QB):**
- Role 1 (r1): Traditional pocket passer (high GI, TEC, STR)
- Role 2 (r2): Mobile quarterback (balanced with more SPD)
- Role 3 (r3): Dual-threat (speed and rushing ability)
- Role 4 (r4): Power runner (physicality focused)
- Role 5 (r5): Balanced all-around
- Role 6 (r6): Specialist or situational

**Running Back (RB):**
- Role 1 (r1): Speed back (high SPD, ELU)
- Role 2 (r2): Power back (high STR, DUR)
- Role 3 (r3): Receiving back (hands and route running)
- Role 4 (r4): Blocking back (blocking skills)
- Role 5 (r5): All-purpose balanced
- Role 6 (r6): Specialist

*(Similar patterns for other positions)*

### Calculation Results

- **Rating Range**: 0-100 for each role
- **Calculation Method**: Weighted sum of attributes / 100
- **Validation**: Total weights per role should equal 100
- **Storage**: Custom configurations persist across sessions

## 🚨 Common Issues and Solutions

### Issue 1: Module Import Errors
```
Error: Cannot resolve module './calculator.js'
Solution: Ensure background.js uses correct import paths
Check: manifest.json has proper service worker configuration
```

### Issue 2: JSON Loading Failures
```
Error: Failed to fetch role_ratings_defaults.json
Solution: Verify file is in web_accessible_resources in manifest.json
Check: File path and spelling are correct
```

### Issue 3: Slider Validation Issues
```
Error: Role total doesn't validate correctly
Solution: Check slider value parsing in sidebar.js
Verify: Total calculation logic handles decimal precision
```

### Issue 4: Storage Persistence Problems
```
Error: Custom ratings don't persist
Solution: Check chrome.storage.local permissions
Verify: Save/load functions handle async properly
```

## 📊 Test Data Examples

### Sample Recruit Data
```javascript
const sampleRecruits = [
  {
    id: 'qb-001',
    pos: 'QB',
    ath: 80, spd: 65, dur: 75, we: 90, sta: 85, str: 85,
    blk: 25, tkl: 30, han: 70, gi: 95, elu: 60, tec: 90
  },
  {
    id: 'rb-001', 
    pos: 'RB',
    ath: 85, spd: 90, dur: 80, we: 75, sta: 85, str: 75,
    blk: 40, tkl: 45, han: 60, gi: 70, elu: 95, tec: 70
  }
];
```

### Expected Role Rating Ranges
- **Elite recruits (90+ overall)**: Role ratings 80-95
- **Good recruits (75-89 overall)**: Role ratings 65-85  
- **Average recruits (60-74 overall)**: Role ratings 50-70
- **Below average (<60 overall)**: Role ratings 30-55

## ✅ Success Criteria

### Functional Requirements
- ✅ All role ratings calculate without errors
- ✅ UI allows complete customization of all positions
- ✅ Custom configurations persist across sessions
- ✅ Reset functionality restores defaults
- ✅ Integration with existing recruit data works seamlessly

### Performance Requirements
- ✅ Role rating calculations complete in <100ms per recruit
- ✅ UI responsiveness maintained during bulk operations
- ✅ Storage operations don't block other functionality
- ✅ Memory usage remains reasonable with large datasets

### User Experience Requirements
- ✅ Intuitive interface with clear feedback
- ✅ Error handling provides helpful messages
- ✅ Configuration changes have immediate visual effect
- ✅ Documentation and help text available where needed

## 🎯 Next Steps After Testing

1. **Performance Optimization**: If needed based on test results
2. **Additional Position Roles**: Expand beyond current 6 roles per position
3. **Advanced Analytics**: Add role comparison and ranking features
4. **Export/Import**: Allow sharing of custom rating configurations
5. **Documentation**: Create user-facing help documentation

## 📞 Support and Debugging

If tests fail, check:
1. **Browser Console**: Look for JavaScript errors
2. **Extension Console**: Check service worker logs
3. **Network Tab**: Verify JSON file loading
4. **Storage Tab**: Confirm data persistence
5. **Element Inspector**: Check UI element states

The implementation is designed to be robust and should handle edge cases gracefully. All components include comprehensive error handling and validation to ensure a smooth user experience.
