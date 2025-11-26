# PHASE 3: APPLY FIXES - MEMO (THE BIG ONE!)

**Location:** `phase-3-ai-remediation/api/fixes.js`

## Overview
This is THE MOST CRITICAL file in Phase 3. It applies data quality fixes to columns and **writes changes back to the Excel file on disk**. This file contains ~600 lines of transformation logic for 20+ different action types.

## ⚠️ CRITICAL CONCEPTS

### File-Based Persistence
**This file WRITES to the Excel file!**

```
User clicks "Fix" 
     ↓
Apply transformation to column data
     ↓
WRITE BACK TO EXCEL FILE ← CRITICAL!
     ↓
Update in-memory state
     ↓
Recalculate stats
     ↓
Return success
```

**Why?** So fixes persist across:
- Server restarts
- Browser refreshes
- Moving to next column
- Phase 4 export

## API Endpoint

### POST `/api/phase3/apply-fixes`
**The giant endpoint that applies all fix types.**

**Request:**
```json
{
  "columnName": "Hostname",
  "actionType": "whitespace",
  "fixes": [
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
  ]
}
```

**Response:**
```json
{
  "success": true,
  "fixedCount": 2,
  "newStats": {
    "totalRecords": 1000,
    "emptyRecords": 5,
    "uniqueValues": 990,
    "duplicates": 8
  },
  "message": "Successfully fixed 2 issues in \"Hostname\""
}
```

## Current Implementation (AS-IS)

### ⚠️ KNOWN ISSUE: Fixes ALL rows, not just selected ones

**Current Behavior:**
```javascript
// User clicks "Fix" on row 3
// But code does this:
columnData = columnData.map(value => {
  return transformValue(value);  // Transforms ALL values!
});
```

**Problem:** 
- Click "Fix" on 1 row → fixes ALL rows
- No selective fixing
- "Fix All" and "Fix" button do the same thing

**What it SHOULD do:**
```javascript
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  columnData[rowIndex] = fix.suggestedFix;
});
```

### Action Types (20+ types!)

#### 1. duplicates ✅ CORRECT
Removes duplicate rows (keeps first occurrence).

```javascript
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  columnData[rowIndex] = null;  // Mark for deletion
  fixedCount++;
});
columnData = columnData.filter(val => val !== null);
```

**Status:** ✅ This one works correctly (only fixes specified rows)

#### 2. empty ✅ CORRECT
Fills empty values with suggested fix.

```javascript
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  columnData[rowIndex] = fix.suggestedFix;
  fixedCount++;
});
```

**Status:** ✅ Works correctly

#### 3. whitespace ⚠️ NEEDS FIX
Removes all spaces from strings.

**Current (WRONG):**
```javascript
columnData = columnData.map(value => {
  if (typeof value === 'string' && value) {
    const trimmed = value.replace(/\s+/g, '');
    if (trimmed !== value) fixedCount++;
    return trimmed;
  }
  return value;
});
```

**Should be:**
```javascript
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  if (rowIndex >= 0 && rowIndex < columnData.length) {
    columnData[rowIndex] = fix.suggestedFix.replace(/"/g, '');
    fixedCount++;
  }
});
```

#### 4-20. ALL OTHER ACTIONS ⚠️ NEED SAME FIX
All follow the `.map()` pattern which fixes ALL rows:
- capitalization
- special-chars
- naming-convention
- city-normalization
- currency
- commas
- numeric-validation
- negative-values
- decimals
- date-format
- invalid-dates
- future-dates
- case-format
- separators
- boolean-standardize

**Pattern to use for all:**
```javascript
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  if (rowIndex >= 0 && rowIndex < columnData.length) {
    columnData[rowIndex] = fix.suggestedFix;
    fixedCount++;
  }
});
```

## Excel File Writing (CRITICAL!)

**This is what makes fixes permanent:**

```javascript
// 1. Read the Excel workbook
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(uploadedFilePath);
const worksheet = workbook.worksheets[0];

// 2. Find the column index
const headerRow = worksheet.getRow(1);
let targetColumnIndex = -1;
headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
  if (String(cell.value) === columnName) {
    targetColumnIndex = colNumber;
  }
});

// 3. Write ALL column data (including fixed rows)
columnData.forEach((value, index) => {
  const rowNumber = index + 2;  // +2: row 1 is header, array is 0-indexed
  const row = worksheet.getRow(rowNumber);
  row.getCell(targetColumnIndex).value = value;
});

// 4. SAVE THE FILE!
await workbook.xlsx.writeFile(uploadedFilePath);
console.log('Saved changes to Excel file');
```

**Key Points:**
- Writes entire column (not just changed rows)
- Row numbering: Excel rows start at 1, row 1 is header, so data starts at row 2
- Must handle null/undefined values
- Preserves all other columns

## Statistics Recalculation

After applying fixes, recalculate stats:

```javascript
const newStats = {
  totalRecords: columnData.length,
  emptyRecords: columnData.filter(v => 
    v === null || v === undefined || v === ''
  ).length,
  uniqueValues: new Set(columnData.filter(v => v)).size
};

// Count duplicates
const valueCountMap = {};
columnData.filter(v => v).forEach(v => {
  const key = String(v);
  valueCountMap[key] = (valueCountMap[key] || 0) + 1;
});
newStats.duplicates = Object.values(valueCountMap)
  .filter(count => count > 1)
  .reduce((sum, count) => sum + count, 0);
```

**Update Phase 3 configuration:**
```javascript
if (phase3Configuration) {
  const colIndex = phase3Configuration.columns.findIndex(
    col => col.name === columnName
  );
  if (colIndex !== -1) {
    phase3Configuration.columns[colIndex] = {
      ...phase3Configuration.columns[colIndex],
      ...newStats
    };
  }
}
```

## Action-Specific Logic

### Whitespace (Remove ALL spaces)
```javascript
const trimmed = value.replace(/\s+/g, '');  // Not just trim()!
```

**Examples:**
- `" server1 "` → `"server1"`
- `"server  2"` → `"server2"`
- `"my server"` → `"myserver"`

### Capitalization (Title Case)
```javascript
const titleCase = value
  .toLowerCase()
  .split(/\s+/)
  .map(word => {
    const lowercase = ['and', 'or', 'the', 'a', 'an'];
    if (lowercase.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  })
  .join(' ');
```

**Examples:**
- `"HELLO WORLD"` → `"Hello World"`
- `"the OFFICE"` → `"The Office"` (capitalize first word)
- `"new york AND london"` → `"New York and London"`

### Naming Convention
```javascript
// 1. Find most common patterns
const patterns = {};
columnData.forEach(value => {
  const base = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  patterns[base] = (patterns[base] || 0) + 1;
});

// 2. Use most common pattern for similar values
const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
for (const [pattern, count] of sortedPatterns) {
  if (isSimilar(normalized, pattern)) {
    return pattern;  // Standardize to this
  }
}
```

**Examples:**
- `ALKpRD003` → `ALKPRD003` (fix case)
- `ALPPRD004` → `ALKPRD004` (fix typo, if ALKPRD is more common)
- `ALK-PRD-005` → `ALKPRD005` (remove separators)

### Date Format (ServiceNow: YYYY-MM-DD)
```javascript
let date;
if (value instanceof Date) {
  date = value;
} else if (typeof value === 'number') {
  // Excel serial date
  date = new Date((value - 25569) * 86400 * 1000);
} else {
  date = new Date(value);
}

const formatted = date.getFullYear() + '-' +
                 String(date.getMonth() + 1).padStart(2, '0') + '-' +
                 String(date.getDate()).padStart(2, '0');
```

**Examples:**
- `"01/15/2024"` → `"2024-01-15"`
- `"2024-1-5"` → `"2024-01-05"`
- `45321` (Excel number) → `"2024-01-15"`

### City Normalization
```javascript
const cityMap = {
  'paris': 'Paris',
  'parise': 'Paris',  // Typo
  'london': 'London',
  // ...
};

const normalized = value.toLowerCase().trim().replace(/\s+/g, '');
if (cityMap[normalized]) {
  return cityMap[normalized];
}
```

**Examples:**
- `"paris"` → `"Paris"`
- `"Parise"` → `"Paris"` (typo fix)
- `"LONDON"` → `"London"`
- `"new york"` → `"New York"`

## State Management

### What Gets Updated:
```javascript
// 1. Raw Excel data in memory (for speed)
app.locals.rawExcelData[columnName] = columnData;

// 2. Phase 3 configuration stats
app.locals.phase3Configuration.columns[index] = {
  ...oldStats,
  ...newStats
};

// 3. Excel file on disk (for persistence!)
await workbook.xlsx.writeFile(uploadedFilePath);
```

## Error Handling

```javascript
try {
  // Apply fixes
  // ...
  
  // Write to Excel
  await workbook.xlsx.writeFile(uploadedFilePath);
  
} catch (writeError) {
  console.error('Error writing to Excel:', writeError);
  // Continue anyway - data is still in memory
  // User can retry or export will use memory version
}
```

**Philosophy:** Even if file write fails, keep in-memory changes. User can still proceed.

## Performance

### Timing:
- **Transformation:** 1-50ms (depending on rows and action type)
- **Excel write:** 50-500ms (depending on file size)
- **Stats recalculation:** 10-50ms
- **Total:** 60-600ms per fix operation

### Optimization Strategies:
1. **Batch fixes:** Apply multiple actions at once
2. **Debounce writes:** Only write every 5 seconds
3. **Background writes:** Write async while user continues
4. **Delta updates:** Only write changed cells (future)

## Testing Checklist

- [ ] Duplicates removed correctly
- [ ] Empty values filled
- [ ] Whitespace trimmed (ALL spaces removed)
- [ ] Capitalization applied (Title Case)
- [ ] Special chars removed
- [ ] Naming conventions standardized
- [ ] Cities normalized
- [ ] Currency symbols removed
- [ ] Commas removed from numbers
- [ ] Dates converted to YYYY-MM-DD
- [ ] Invalid dates flagged
- [ ] Boolean values standardized
- [ ] Excel file updated on disk
- [ ] Stats recalculated correctly
- [ ] Phase 3 config updated
- [ ] Error handling works
- [ ] Works with 1 row
- [ ] Works with 10,000 rows
- [ ] Handles null values
- [ ] Handles undefined values

## Common Issues & Solutions

### Issue: Fixes applied to ALL rows
**Cause:** Using `.map()` instead of `fixes.forEach()`
**Solution:** Refactor each action type to use forEach pattern

### Issue: Excel file not updated
**Cause:** Write error, path issue, or permissions
**Solution:** Check console logs, verify uploads/ directory permissions

### Issue: Stats not updating
**Cause:** Not recalculating after fixes
**Solution:** Ensure stats recalculation runs after transformations

### Issue: Slow performance on large columns
**Cause:** Writing entire column every time
**Solution:** Consider delta updates (only changed rows)

### Issue: Data loss on server restart
**Cause:** Not writing to file
**Solution:** Verify Excel write is working

## Future Improvements

### 1. Selective Row Fixes (PRIORITY!)
```javascript
// Instead of transforming ALL rows:
// ONLY transform specified rows
fixes.forEach(fix => {
  const rowIndex = fix.rowNumber - 2;
  columnData[rowIndex] = applyTransformation(columnData[rowIndex]);
});
```

### 2. Undo/Redo
```javascript
// Keep history of changes
const history = [];
history.push({
  columnName,
  actionType,
  oldData: [...columnData],
  newData: [...fixedData]
});

// Undo
function undo() {
  const last = history.pop();
  columnData = last.oldData;
  writeToExcel();
}
```

### 3. Batch Operations
```javascript
// Apply multiple actions at once
{
  "actions": [
    { "type": "whitespace", "fixes": [...] },
    { "type": "capitalization", "fixes": [...] }
  ]
}
```

### 4. Preview Mode
```javascript
// Show what WOULD happen without applying
{
  "preview": true,
  "dryRun": true
}
// Returns transformed data but doesn't save
```

### 5. Delta Updates (Performance)
```javascript
// Only write changed cells
const changes = [];
fixes.forEach(fix => {
  changes.push({
    row: fix.rowNumber,
    oldValue: fix.currentValue,
    newValue: fix.suggestedFix
  });
});

// Write only these cells (not entire column)
writeChangesToExcel(changes);
```

## Dependencies

```javascript
import express from 'express';
import ExcelJS from 'exceljs';  // For writing Excel files
```

## Security Considerations

⚠️ **Data Integrity:**
- [ ] Validate column name exists
- [ ] Validate row numbers are in range
- [ ] Handle malformed suggested fixes
- [ ] Prevent SQL injection in values
- [ ] Sanitize file paths
- [ ] Backup before major changes

## Related Files

- Issue Detection: `/phase-3-ai-remediation/api/actions.js`
- Config: `/phase-3-ai-remediation/api/config.js`
- Frontend: `/shared/js/phase3-column.js`

## Critical Reminders

1. **ALWAYS write to Excel file** - This makes changes permanent
2. **Recalculate stats** - Keep UI in sync
3. **Update phase3Configuration** - Next column needs latest stats
4. **Handle errors gracefully** - Don't lose user's work
5. **Test with large files** - Performance matters
6. **Row numbering:** Excel row = array index + 2

## Fix Request Flow

```
User clicks "Fix" button
       ↓
Frontend: POST /api/phase3/apply-fixes
  {
    columnName: "Hostname",
    actionType: "whitespace",
    fixes: [{ rowNumber: 3, ... }]
  }
       ↓
Backend: Load column data
       ↓
Backend: Apply transformations
       ↓
Backend: Write to Excel file ← CRITICAL
       ↓
Backend: Update memory
       ↓
Backend: Recalculate stats
       ↓
Backend: Return success + new stats
       ↓
Frontend: Update UI
       ↓
Frontend: Show success message
       ↓
User sees updated quality score
```

---

**Last Updated:** 2024-01-21
**Maintained By:** Fed
**CRITICAL:** This file handles file writes. Any bugs here can corrupt user data!
**TODO:** Refactor all `.map()` actions to use `fixes.forEach()` pattern
