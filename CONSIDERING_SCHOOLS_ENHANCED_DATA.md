# Enhanced Considering Schools Data Extraction

## Overview

The scraper has been enhanced to extract comprehensive considering schools data from the Advanced Recruiting page, providing detailed information about each school a recruit is considering.

## Enhanced Data Format

### Previous Format
```
Hofstra University (High), Georgia Southern University (Medium)
```

### New Enhanced Format
```
Hofstra University (52672), 1128 miles, SIM AI, 14 | 14; Georgia Southern University (52678), 869 miles, SIM AI, 14 | 14; Texas Southern University (52697), 635 miles, SIM AI, 12 | 12
```

## Data Fields Extracted

For each considering school, the following information is now captured:

1. **School Name**: Full university/college name
2. **School ID**: 5-digit school identifier (in parentheses)
3. **Distance**: Miles from recruit's location (rounded to whole number)
4. **Coach Name**: Recruiting coach name (or "SIM AI" if empty/null)
5. **Scholarships Start**: Initial scholarship count for the position
6. **Scholarships Remaining**: Current available scholarships for the position

## Implementation Details

### HTML Structure Parsed
The scraper now correctly parses the nested HTML structure within `cells[42]`:

```html
<td class="recruit-considering">
  <table class="considering-subtable">
    <tbody class="considering" consideringrecruitid="28725877">
      <tr class="considering" schoolid="52672">
        <td class="hidden considering-schoolid">52672</td>
        <td class="considering-schoolname">Hofstra University</td>
        <td class="considering-miles">
          <span class="considering-miles">1127.81108588659</span> Miles
        </td>
        <td class="considering-coachname"></td>
        <td class="considering-divisionid">D1AA</td>
        <td class="considering-scholarships-start">14</td>
        <td class="considering-scholarships-remaining">14</td>
      </tr>
      <!-- Additional school rows... -->
    </tbody>
  </table>
</td>
```

### Enhanced parseConsidering() Function

The `parseConsidering()` function has been completely rewritten to:

- Target the correct HTML structure: `table.considering-subtable → tbody.considering → tr.considering`
- Extract all required data fields using CSS selectors
- Apply formatting rules (rounded miles, "SIM AI" for empty coach names)
- Handle error cases gracefully with robust fallbacks
- Build the formatted string according to specifications

### Data Processing Rules

1. **Miles Calculation**: 
   - Extracts precise decimal value from `<span class="considering-miles">`
   - Rounds to nearest whole number using `Math.round()`

2. **Coach Name Processing**:
   - Extracts from `.considering-coachname` cell
   - Replaces empty strings or null values with "SIM AI"

3. **Scholarship Data**:
   - Extracts starting scholarship count from `.considering-scholarships-start`
   - Extracts remaining scholarship count from `.considering-scholarships-remaining`
   - Displays in format: `start | remaining`

4. **School Separation**:
   - Multiple schools separated by semicolons (`;`)
   - Maintains clean, readable format for display

### Error Handling

Robust error handling ensures data integrity:

- **Missing HTML Structure**: Falls back to "undecided" if table structure not found
- **Invalid Numeric Data**: Defaults to 0 for miles/scholarships if parsing fails
- **Missing Cell Data**: Uses empty string defaults with appropriate fallbacks
- **Malformed Rows**: Skips individual school entries that can't be parsed
- **No Schools Found**: Returns "undecided" if no valid school data exists

## Backward Compatibility

The enhanced format maintains full compatibility with existing extension features:

### School ID Detection
- Existing regex pattern `\b\d{5}\b` continues to work for school ID extraction
- Green/yellow highlighting system remains functional
- Filtering and search capabilities preserved

### Display Integration
- String-based format works seamlessly with existing UI components
- Tooltips and table display handle the enhanced data automatically
- Export/import functionality requires no modifications

### Data Storage
- Enhanced considering data stored as string in same field
- No database schema changes required
- Existing recruits retain compatibility during updates

## Usage in Both Scraping Modes

### Full Scrape Mode
- All recruits get enhanced considering schools data during initial scraping
- Comprehensive data extraction for new recruit database creation

### Refresh Mode
- Existing recruits have their considering schools data updated with enhanced format
- Maintains data consistency across refresh operations
- Preserves enhanced data structure during selective field updates

## Benefits of Enhanced Data

### Improved Recruiting Intelligence
1. **Distance Analysis**: Precise mileage helps evaluate recruit accessibility
2. **Scholarship Tracking**: Monitor available positions at competing schools
3. **Coach Identification**: Track which coaches are recruiting specific players
4. **Competition Assessment**: Better understanding of recruiting landscape

### Enhanced User Experience
1. **Richer Information**: More context for recruiting decisions
2. **Better Filtering**: Potential for distance/scholarship-based filters
3. **Improved Display**: More informative considering schools column
4. **Strategic Planning**: Better data for recruiting strategy development

## Technical Notes

### Performance Impact
- Minimal performance impact due to efficient CSS selector usage
- Error handling prevents parsing failures from affecting overall scraping
- Maintains existing scraping speed for large datasets

### Data Validation
- Comprehensive validation ensures data quality
- Graceful degradation when expected data is missing
- Consistent formatting across all extracted school entries

### Future Enhancement Opportunities
- Potential for additional filtering based on distance/scholarships
- Possible integration with recruiting workflow features
- Enhanced analytics based on scholarship availability
- Coach-based recruiting pattern analysis

## Example Output

For a recruit considering multiple schools, the enhanced output provides comprehensive recruiting intelligence:

```
Hofstra University (52672), 1128 miles, SIM AI, 14 | 14; Georgia Southern University (52678), 869 miles, Coach Johnson, 14 | 12; Texas Southern University (52697), 635 miles, SIM AI, 12 | 12
```

This format enables users to quickly assess:
- Which schools are closest to the recruit
- Scholarship availability at each institution
- Whether human coaches or AI are handling recruitment
- Competitive landscape for the recruit's services
