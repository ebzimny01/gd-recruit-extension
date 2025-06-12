# Considering Schools Column Formatting

## Overview

The "Considering Schools" column in the recruits table now automatically highlights recruits based on whether your current school is included in their considering list.

## Visual Indicators

### Green Background (Only School)
- **When**: Your school is the ONLY school the recruit is considering
- **Styling**: Light green background with green left border and checkmark (✓) icon
- **Example**: `54006 (Howard Payne University)` - when Howard Payne is your current school

### Yellow Background (Among Others)
- **When**: Your school is included but there are additional schools being considered
- **Styling**: Light yellow background with yellow left border and warning (⚠) icon  
- **Examples**: 
  - `54431 (Hanover College), 54006 (Howard Payne University)` - when Howard Payne is your current school
  - `54006 (Howard Payne University), 54448 (Greensboro College), 54456 (Westminster College)`

### No Highlighting
- **When**: Your school is not in the considering list or the status is "Undecided"
- **Styling**: Default table cell appearance

## Implementation Details

### School ID Matching
The system extracts 5-digit school IDs from the considering text using the pattern `\b\d{5}\b` and compares them against your current school's team ID.

### Data Sources
- **Current School ID**: Retrieved from the team cookie (`gd_teamid`) and stored in extension configuration
- **School Information**: Cross-referenced with the GDR data file (`data/gdr.csv`)

### Function: `checkCurrentSchoolInConsidering(considering, currentTeamId)`
- **Parameters**:
  - `considering`: The considering schools text (e.g., "54006 (Howard Payne University), 54448 (Greensboro College)")
  - `currentTeamId`: The current school's team ID as a string
- **Returns**:
  - `'only'`: Current school is the only one in the list
  - `'included'`: Current school is among multiple schools
  - `'not_included'`: Current school is not in the list

### CSS Classes
- `.considering-school-only`: Green highlighting for exclusive consideration
- `.considering-school-included`: Yellow highlighting for shared consideration

## Accessibility Features

### Enhanced Tooltips
- Shows full considering schools list on hover
- Includes status message explaining the highlighting:
  - "✓ Your school is the ONLY school this recruit is considering"
  - "⚠ Your school is among the schools this recruit is considering"

### Visual Indicators
- Color-coded left borders for quick visual identification
- Small icons (✓ and ⚠) in the top-right corner of highlighted cells
- High contrast colors for accessibility

## Browser Compatibility

This feature works in all Chromium-based browsers that support the extension, including:
- Google Chrome
- Microsoft Edge
- Brave Browser
- Opera

## Performance Considerations

- School ID extraction uses efficient regex matching
- Highlighting is applied during the normal table rendering process
- No additional API calls or database queries required
- Team ID lookup is cached in extension storage for performance

## Future Enhancements

Potential improvements could include:
- Filtering options to show only recruits considering your school
- Sorting by consideration status
- Configurable color themes
- Export functionality highlighting these recruits
- Integration with recruitment workflow features
