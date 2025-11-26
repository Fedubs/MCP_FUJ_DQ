# PHASE 3: ACTIONS & ISSUE DETECTION - MEMO

**Location:** `phase-3-ai-remediation/api/actions.js`

## Overview
This file generates remediation actions for each column and detects specific data quality issues. It's the "brain" that decides what problems exist and what fixes are available.

## What This File Does

### 1. Generate Rule-Based Actions
- Analyzes column type and statistics
- Creates appropriate remediation actions
- Prioritizes actions by severity (critical → warning → info)

### 2. Detect Specific Issues
- Scans column data for problematic rows
- Returns row numbers and suggested fixes
- Limits to 100 issues for performance

### 3. Claude AI Integration (Optional)
- Can use Claude API for intelligent suggestions
- Analyzes data patterns
- Provides confidence scores

## API Endpoints

### POST `/api/phase3/remediate-column` (Claude AI)
Uses Anthropic Claude API to analyze a column and suggest fixes.

**Request:**
```json
{
  "columnName": "Hostname",
  "columnType": "alphanumeric",
  "columnData": ["server1", "server2", ...],  // First 20 values
  "stats": {
    "totalRecords": 1000,
    "emptyRecords": 5,
    "duplicates": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "columnName": "Hostname",
  "tokensUsed": 450,
  "proposals": [
    {
      "title": "Standardize Naming Convention",
      "description": "Normalize server names to consistent format (uppercase, no spaces)",
      "confidence": 85,
      "recordsAffected": 120,
      "expectedImprovement": 5
    }
  ]
}
```

**Note:** This is rarely used now - rule-based approach is preferred for speed.

### POST `/api/phase3/generate-actions-rules` ⭐ PRIMARY ENDPOINT
Generates remediation actions based on column type and stats.

**Request:**
```json
{
  "columnName": "Serial Number",
  "columnType": "alphanumeric",
  "stats": {
    "totalRecords": 1000,
    "emptyRecords": 5,
    "duplicates": 10,
    "uniqueValues": 985,
    "isUniqueQualifier": true,
    "isReferenceData": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "actions": [
    {
      "type": "duplicates",
      "title": "⚠️ Remove Duplicates (CRITICAL)",
      "description": "This column is marked as a unique qualifier but has 10 duplicate values.",
      "issueCount": 10,
      "severity": "critical"
    },
    {
      "type": "empty",
      "title": "Fill 5 Empty Values",
      "description": "1% of records are empty.",
      "issueCount": 5,
      "severity": "info"
    },
    {
      "type": "whitespace",
      "title": "Trim Whitespace",
      "description": "Remove leading/trailing spaces and collapse multiple spaces.",
      "issueCount": 0,
      "severity": "warning"
    }
  ]
}
```

### POST `/api/phase3/get-issues` ⭐ PRIMARY ENDPOINT
Detects specific problematic rows for a given action type.

**Request:**
```json
{
  "columnName": "Hostname",
  "actionType": "whitespace",
  "columnData": ["server1", " server2 ", "server3  ", ...]  // Full column data
}
```

**Response:**
```json
{
  "success": true,
  "issues": [
    {
      "rowNumber": 3,
      "currentValue": " server2 ",
      "suggestedFix": "server2"
    },
    {
      "rowNumber": 4,
      "currentValue": "server3  ",
      "suggestedFix": "server3"
    }
    // ... up to 100 issues
  ]
}
```

## Action Types & Generation Rules

### Universal Actions (All Types)

#### 1. Duplicates
**When Generated:**
- Column is `isUniqueQualifier` AND has duplicates → CRITICAL
- Column has duplicates > 10% of records → WARNING

**Example:**
```javascript
if (stats.isUniqueQualifier && stats.duplicates > 0) {
  actions.push({
    type: 'duplicates',
    title: '⚠️ Remove Duplicates (CRITICAL)',
    severity: 'critical'
  });
}
```

#### 2. Empty Values
**When Generated:** Any column with empty records

**Severity:**
- >20% empty → CRITICAL
- 5-20% empty → WARNING
- <5% empty → INFO

### String Column Actions

1. **whitespace** - Remove spaces (ALWAYS added)
2. **capitalization** - Title Case (ALWAYS added)
3. **special-chars** - Remove special characters (ALWAYS added)
4. **naming-convention** - Standardize variations (ALWAYS added)
5. **city-normalization** - Fix city names (if column name contains "city", "location", "site")

### Number Column Actions

1. **currency** - Remove $, €, £ symbols
2. **commas** - Remove thousand separators (1,234 → 1234)
3. **numeric-validation** - Flag non-numeric values (CRITICAL)
4. **negative-values** - Convert negative to positive
5. **decimals** - Standardize to 2 decimal places

### Date Column Actions

1. **date-format** - Convert to YYYY-MM-DD (CRITICAL for ServiceNow)
2. **invalid-dates** - Flag unparseable dates (CRITICAL)
3. **future-dates** - Flag dates in the future
4. **old-dates** - Flag dates before 1990

### Alphanumeric Column Actions

1. **whitespace** - Remove spaces (ALWAYS added)
2. **case-format** - Convert to uppercase
3. **separators** - Standardize to hyphens
4. **length-validation** - Check for unexpected lengths
5. **naming-convention** - Normalize variations

### Boolean Column Actions

1. **boolean-standardize** - Convert yes/no/1/0 to true/false (CRITICAL)
2. **boolean-invalid** - Flag invalid boolean values (CRITICAL)

## Issue Detection Logic

### Duplicates
```javascript
const valueMap = {};
columnData.forEach((value, index) => {
  if (!valueMap[value]) valueMap[value] = [];
  valueMap[value].push(index);
});

// Find values that appear more than once
Object.entries(valueMap).forEach(([value, indices]) => {
  if (indices.length > 1) {
    // Keep first, flag rest for deletion
    indices.slice(1).forEach(rowIndex => {
      issues.push({
        rowNumber: rowIndex + 2,  // +2 because Excel rows start at 1, and row 1 is header
        currentValue: value,
        suggestedFix: 'Delete (keep first occurrence in row ' + (indices[0] + 2) + ')'
      });
    });
  }
});
```

### Whitespace
```javascript
columnData.forEach((value, index) => {
  if (typeof value === 'string' && value) {
    const trimmed = value.replace(/\s+/g, '');  // Remove ALL spaces
    if (trimmed !== value) {
      issues.push({
        rowNumber: index + 2,
        currentValue: '"' + value + '"',
        suggestedFix: '"' + trimmed + '"'
      });
    }
  }
});
```

### Naming Convention
```javascript
// 1. Find most common patterns
const patterns = {};
columnData.forEach(value => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  patterns[normalized] = (patterns[normalized] || 0) + 1;
});

const sortedPatterns = Object.entries(patterns)
  .sort((a, b) => b[1] - a[1]);

// 2. Suggest standardization for non-matching values
columnData.forEach((value, index) => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (normalized !== value) {
    // Find best matching pattern using isSimilar()
    let bestMatch = normalized;
    for (const [pattern, count] of sortedPatterns) {
      if (isSimilar(normalized, pattern, 2)) {
        bestMatch = pattern;
        break;
      }
    }
    
    issues.push({
      rowNumber: index + 2,
      currentValue: value,
      suggestedFix: bestMatch
    });
  }
});
```

### City Normalization
```javascript
const cityMap = {
  'paris': 'Paris',
  'parise': 'Paris',  // Typo
  'london': 'London',
  'sydney': 'Sydney'
  // ... more cities
};

columnData.forEach((value, index) => {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '');
  
  if (cityMap[normalized]) {
    const correctName = cityMap[normalized];
    if (correctName !== value) {
      issues.push({
        rowNumber: index + 2,
        currentValue: value,
        suggestedFix: correctName
      });
    }
  }
});
```

### Date Format (ServiceNow YYYY-MM-DD)
```javascript
columnData.forEach((value, index) => {
  if (!value) return;
  
  // Skip if already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return;
  
  // Try to parse
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    // Excel serial date
    date = new Date((value - 25569) * 86400 * 1000);
  } else {
    date = new Date(value);
  }
  
  if (date && !isNaN(date.getTime())) {
    const formatted = date.getFullYear() + '-' + 
                     String(date.getMonth() + 1).padStart(2, '0') + '-' +
                     String(date.getDate()).padStart(2, '0');
    
    issues.push({
      rowNumber: index + 2,
      currentValue: String(value),
      suggestedFix: formatted
    });
  }
});
```

## Helper Functions

### isSimilar(str1, str2, threshold = 2)
Calculates Levenshtein distance to check if two strings are similar.

**Use Cases:**
- Detect typos: "ALKPRD" vs "ALKpRD" vs "ALPPRD"
- Match patterns with small variations
- City name normalization: "paris" vs "parise"

**Algorithm:** Levenshtein Distance (edit distance)
- Returns true if distance ≤ threshold
- threshold=2 means up to 2 character changes (add/remove/replace)

**Examples:**
```javascript
isSimilar("ALKPRD", "ALKpRD", 2)    // true (case difference)
isSimilar("Paris", "Parise", 2)     // true (1 char added)
isSimilar("London", "Londonn", 2)   // true (1 char added)
isSimilar("Tokyo", "Sydney", 2)     // false (too different)
```

## Performance Considerations

### Issue Detection Performance
- **Small columns (<100 rows):** <10ms
- **Medium columns (100-1000 rows):** 10-50ms
- **Large columns (1000-10000 rows):** 50-200ms
- **Very large (>10000 rows):** 200-1000ms

### Optimization: Limit to 100 Issues
```javascript
res.json({
  success: true,
  issues: issues.slice(0, 100)  // Only return first 100
});
```

**Why?** 
- Frontend can only display ~100 at once
- Faster response times
- User can fix 100, then re-scan

## Common Issues & Solutions

### Issue: Actions not appearing
**Cause:** Column type not detected correctly
**Solution:** Check detectColumnType() in Phase 1

### Issue: Too many false positives
**Cause:** Overly aggressive pattern matching
**Solution:** Adjust isSimilar() threshold

### Issue: City normalization missing cities
**Cause:** Limited city dictionary
**Solution:** Add more cities to cityNormalizations map

### Issue: Slow issue detection
**Cause:** Large dataset
**Solution:** Consider limiting to first 1000 rows, then batch process

## Testing Checklist

- [ ] Actions generated for string columns
- [ ] Actions generated for number columns
- [ ] Actions generated for date columns
- [ ] Actions generated for alphanumeric columns
- [ ] Critical severity for unique qualifier duplicates
- [ ] Whitespace detection works
- [ ] Capitalization detection works
- [ ] Date format detection works (ServiceNow format)
- [ ] Naming convention finds patterns
- [ ] City normalization works
- [ ] Issue limit to 100 enforced
- [ ] isSimilar() detects typos correctly

## Future Enhancements

1. **Machine Learning Pattern Detection**
   - Learn patterns from data
   - Anomaly detection
   - Smart suggestions

2. **Custom Action Templates**
   - User-defined actions
   - Regex-based fixes
   - Scripted transformations

3. **Batch Issue Detection**
   - Detect issues across multiple columns
   - Cross-column validation
   - Relationship checks

4. **Progressive Scanning**
   - Load first 100 issues immediately
   - Background scan for more
   - Streaming results

## Dependencies

```javascript
import express from 'express';
// Uses app.locals.anthropic for Claude API (optional)
```

## Related Files

- Frontend: `/shared/js/phase3-column.js`
- Fixes: `/phase-3-ai-remediation/api/fixes.js`
- Config: `/phase-3-ai-remediation/api/config.js`

## Action Priority Order

Actions are displayed in this order (by severity):
1. **CRITICAL** (red) - Must fix
2. **WARNING** (yellow) - Should fix  
3. **INFO** (blue) - Nice to fix

Within same severity, order by:
1. Unique qualifier issues first
2. High issue count next
3. Type-specific actions last

---

**Last Updated:** 2024-01-21
**Maintained By:** Fed
**Note:** Rule-based approach is preferred over Claude API for speed and cost
