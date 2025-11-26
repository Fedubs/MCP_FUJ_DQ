# PHASE 3: AI REMEDIATION - CONFIG & LANDING - MEMO

**Location:** `phase-3-ai-remediation/api/config.js`

## Overview
Phase 3 Config handles the landing page and configuration loading for AI-powered data remediation. This is where users see an overview of their data quality and prepare to clean their data column-by-column.

## What This Phase Does

### 1. Landing Page Display
- Shows Phase 3 overview and process explanation
- Displays quality score widget
- Lists all columns to be remediated
- "Begin Remediation" button

### 2. Configuration Loading
- Loads Phase 2 configuration from app.locals
- Provides config to frontend
- Lists columns that need remediation

### 3. Excel Data Access
- **CRITICAL:** Reads FRESH data from Excel file (not memory)
- Ensures all changes from previous actions are included
- Supports real-time data updates

## API Endpoints

### GET `/api/phase3/content`
Returns HTML for Phase 3 landing page with:
- Quality score widget (persistent)
- "How Phase 3 Works" explanation
- Column list to remediate
- "Begin Remediation" button

**Visual Structure:**
```
┌─────────────────────────────────────┐
│ AI-Powered Remediation              │
├─────────────────────────────────────┤
│ Quality Score Widget                │
│  90% | 1000 records | 10 columns    │
├─────────────────────────────────────┤
│ How Phase 3 Works:                  │
│  3.1 → Column-by-Column             │
│  3.2 → Type-Specific Actions        │
│  3.3 → Real-Time Quality Updates    │
│  4   → Review & Export              │
├─────────────────────────────────────┤
│ Your Columns:                       │
│  • Serial Number (990 unique)       │
│  • Hostname (985 unique)            │
│  • IP Address (950 unique)          │
│  ... 7 more columns                 │
├─────────────────────────────────────┤
│    [Begin Remediation →]            │
└─────────────────────────────────────┘
```

### GET `/api/phase3/configuration`
Retrieves the saved Phase 2 configuration.

**Response:**
```json
{
  "fileName": "hardware_assets.xlsx",
  "dataQualityScore": 90,
  "columns": [
    {
      "name": "Serial Number",
      "type": "alphanumeric",
      "totalRecords": 1000,
      "emptyRecords": 0,
      "duplicates": 0,
      "uniqueValues": 1000,
      "isUniqueQualifier": true,
      "isReferenceData": false
    }
    // ... all configured columns
  ]
}
```

**Error Response:**
```json
{
  "error": "No configuration available. Please complete Phase 2 first."
}
```

**Use Case:** Frontend needs to know:
- Which columns to remediate
- Which are unique qualifiers (CRITICAL priority)
- Which are reference data (special validation)
- Initial quality score

### GET `/api/phase3/raw-data` ⭐ CRITICAL ENDPOINT
**This is THE MOST IMPORTANT endpoint for file-based persistence!**

Reads FRESH data directly from the Excel file on disk.

**Why Read from File?**
- ✅ Always gets latest data (after previous fixes)
- ✅ Persists across server restarts
- ✅ No memory size limits
- ✅ Real source of truth

**Flow:**
```javascript
1. Get uploadedFilePath from app.locals
2. Read Excel file using ExcelJS
3. Extract column headers
4. Extract all data rows
5. Return as JSON: { "Hostname": [...], "IP": [...] }
```

**Response:**
```json
{
  "Serial Number": ["SN001", "SN002", "SN003", ...],
  "Hostname": ["server1", "server2", "server3", ...],
  "IP Address": ["10.0.0.1", "10.0.0.2", "10.0.0.3", ...],
  "Location": ["Brisbane", "Sydney", "Melbourne", ...]
}
```

**Error Response:**
```json
{
  "error": "No file uploaded. Please upload a file in Phase 1 first."
}
```

**Performance:**
- Small files (<1MB): ~50ms
- Medium files (1-10MB): ~200-500ms
- Large files (10-50MB): ~1-3 seconds

## Data Storage

### What Gets Used:
```javascript
// From Phase 1:
app.locals.uploadedFilePath = "uploads/abc123.xlsx"

// From Phase 2:
app.locals.phase3Configuration = { ... }

// NOT USED (deprecated):
// app.locals.rawExcelData = { ... }  ← OLD APPROACH
```

### Why File-Based Storage?

**Before (Memory-Based):**
```
Phase 1: Upload → Store in memory
Phase 3: Fix column A → Update memory
Phase 3: Load column B → Read from memory ✓
[Server Restart]
Phase 3: Load column B → LOST! ✗
```

**After (File-Based):**
```
Phase 1: Upload → Store in file
Phase 3: Fix column A → Write to file ✓
Phase 3: Load column B → Read from file ✓
[Server Restart]
Phase 3: Load column B → Read from file ✓
```

## Flow Diagram

```
User completes Phase 2
       ↓
Lands on Phase 3 landing page
       ↓
GET /api/phase3/content
  → Display overview
  → Show quality widget
  → List columns
       ↓
User clicks "Begin Remediation"
       ↓
Frontend calls:
  1. GET /api/phase3/configuration
     → Get column settings
  
  2. GET /api/phase3/raw-data
     → Get current Excel data
       ↓
Navigate to /phase3/column/[FirstColumn]
       ↓
Phase 3 Actions & Fixes begin
```

## Key Implementation Details

### Excel File Reading (CRITICAL!)
```javascript
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(uploadedFilePath);
const worksheet = workbook.worksheets[0];

// Extract headers
const headerRow = worksheet.getRow(1);
const columns = [];
const columnData = {};

headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
  const columnName = String(cell.value || 'Column ' + colNumber);
  columns.push(columnName);
  columnData[columnName] = [];
});

// Extract data (INCLUDE EMPTY CELLS!)
worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) return; // Skip header
  
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnName = columns[colNumber - 1];
    if (columnName) {
      columnData[columnName].push(cell.value);
    }
  });
});
```

**Important:** `includeEmpty: true` maintains row alignment!

### Error Handling
```javascript
try {
  await workbook.xlsx.readFile(uploadedFilePath);
} catch (error) {
  return res.status(500).json({
    error: 'Failed to read Excel file: ' + error.message
  });
}
```

## Common Issues & Solutions

### Issue: "No file uploaded" error
**Cause:** uploadedFilePath not set in Phase 1
**Solution:** Verify Phase 1 stores file path correctly

### Issue: Data doesn't reflect previous fixes
**Cause:** Reading from memory instead of file
**Solution:** Ensure using `/api/phase3/raw-data` not old memory-based approach

### Issue: File not found
**Cause:** File was deleted or server restarted with temp files cleared
**Solution:** Check uploads/ directory exists and has write permissions

### Issue: Slow data loading
**Cause:** Large Excel file
**Solution:** Consider caching parsed data for 5 minutes

## Phase 3 Process Explanation

The landing page explains the 4-step process:

### Step 3.1: Column-by-Column Remediation
- Work through one column at a time
- See all issues in that column
- Fix individually or in bulk

### Step 3.2: Type-Specific Actions
- String columns: whitespace, capitalization, special chars
- Number columns: currency symbols, commas, decimals
- Date columns: format standardization, invalid dates
- Alphanumeric: case format, separators

### Step 3.3: Real-Time Quality Updates
- Watch quality score improve as you fix
- See stats update immediately
- Track progress (Column 3 of 10)

### Step 4: Review & Export
- Final review of cleaned data
- Download cleaned Excel file
- Compare before/after

## Frontend Integration

### On Page Load
```javascript
// 1. Fetch configuration
const config = await fetch('/api/phase3/configuration').then(r => r.json());

// 2. Display column list
config.columns.forEach(col => {
  displayColumn(col.name, col.uniqueValues, col.emptyRecords);
});

// 3. Update quality widget
document.getElementById('widgetQualityScore').textContent = config.dataQualityScore;
```

### On "Begin Remediation" Click
```javascript
// 1. Get first column
const firstColumn = config.columns[0].name;

// 2. Fetch raw data for that column
const rawData = await fetch('/api/phase3/raw-data').then(r => r.json());
const columnData = rawData[firstColumn];

// 3. Navigate to column detail page
window.location.href = `/phase3/column/${encodeURIComponent(firstColumn)}`;
```

## Dependencies

```javascript
import express from 'express';
import ExcelJS from 'exceljs';  // For reading Excel files
```

## Testing Checklist

- [ ] Landing page displays
- [ ] Quality widget shows correct data
- [ ] Column list displays all columns
- [ ] "Begin Remediation" button works
- [ ] Configuration loads correctly
- [ ] Raw data reads from file (not memory)
- [ ] Handles missing configuration gracefully
- [ ] Handles missing file gracefully
- [ ] Works after server restart
- [ ] Works with large files (10MB+)
- [ ] Error messages are clear

## Performance Optimization

### Caching Strategy (Future)
```javascript
// Cache parsed Excel data for 5 minutes
const cache = new Map();

app.get('/api/phase3/raw-data', async (req, res) => {
  const cacheKey = uploadedFilePath;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < 300000)) {
    return res.json(cached.data);
  }
  
  // Read from file...
  const data = await readExcelFile(uploadedFilePath);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  res.json(data);
});
```

## Security Considerations

⚠️ **File Access:**
- [ ] Validate uploadedFilePath is within uploads/ directory
- [ ] Prevent path traversal attacks (../ in filename)
- [ ] Check file exists before reading
- [ ] Limit file size read (max 50MB)

## Related Files

- Frontend: `/phase-3-ai-remediation/phase3.html`
- JavaScript: `/shared/js/phase3.js`
- Styles: `/shared/css/servicenow-style.css`
- Next: `/phase-3-ai-remediation/api/actions.js` (actions generation)
- Next: `/phase-3-ai-remediation/api/fixes.js` (applying fixes)

## Column Detail Page Route

**Note:** The column detail page route is in **main server.js**, not in this file!

```javascript
// In server.js (NOT in this file!)
app.get('/phase3/column/:columnName', (req, res) => {
  // Returns HTML for column remediation page
  // Has 3 panels: Actions | Issues | Preview
});
```

## Future Enhancements

1. **Smart Column Ordering**
   - Prioritize columns with most issues
   - Put unique qualifiers first
   - Group related columns

2. **Batch Mode**
   - Apply same action to multiple columns
   - "Fix all whitespace across all columns"

3. **Progress Persistence**
   - Save which columns are completed
   - Resume where you left off
   - "Skip this column" option

4. **Preview Mode**
   - See all changes before applying
   - Undo last action
   - Rollback to original

5. **AI Suggestions**
   - "We noticed 'Milan' and 'Milano' - standardize?"
   - Smart pattern detection
   - Anomaly detection

---

**Last Updated:** 2024-01-21
**Maintained By:** Fed
**Critical Note:** This file handles FILE-BASED data access. Do NOT revert to memory-based approach!
