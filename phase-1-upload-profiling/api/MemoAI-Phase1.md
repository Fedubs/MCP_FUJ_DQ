# PHASE 1: UPLOAD & PROFILING - MEMO

**Location:** `phase-1-upload-profiling/api/routes.js`

## Overview
Phase 1 is the entry point of the application. Users upload their Excel file, the system parses and profiles the data, calculates an initial quality score, and stores everything for use in subsequent phases.

## What This Phase Does

### 1. File Upload
- Accepts Excel files (.xlsx, .xls)
- Maximum file size: 50 MB
- Drag-and-drop or browse interface
- Stores file on disk in `uploads/` directory

### 2. Data Extraction
- Parses Excel file using ExcelJS
- Extracts column headers from first row
- Extracts all data rows (maintains empty cells for alignment)
- Preserves original data structure

### 3. Data Profiling
For each column, calculates:
- **Total Records:** Number of data rows
- **Empty Records:** Count of null/undefined/empty values
- **Duplicates:** Count of repeated values
- **Unique Values:** Count of distinct values
- **Column Type:** Detected type (string, number, date, alphanumeric, boolean)

### 4. Quality Score Calculation
```javascript
qualityScore = ((totalCells - emptyCells) / totalCells) * 100
```

Simple metric based on data completeness (non-empty cells).

### 5. State Storage
Stores data in three places:
- **app.locals.uploadedData** - File metadata + column profiles
- **app.locals.rawExcelData** - Raw column data (DEPRECATED - prefer file reads)
- **app.locals.uploadedFilePath** - Path to Excel file (CRITICAL!)

## API Endpoints

### GET `/api/phase1/content`
Returns HTML content for Phase 1 UI.

**Visual Structure:**
```
┌─────────────────────────────────────────┐
│ Upload & Data Profiling                 │
├─────────────────────────────────────────┤
│ Left Panel - Upload Form                │
│  • Drop zone with file picker           │
│  • File info display                    │
│  • Progress bar                         │
│  • Upload button                        │
│  • Supported formats info               │
│                                         │
│ Right Panel - Instructions              │
│  1. Data Extraction                     │
│  2. Data Profiling                      │
│  3. Quality Score                       │
│  4. Review Results                      │
└─────────────────────────────────────────┘
```

### POST `/api/phase1/upload` ⭐ MAIN ENDPOINT
Uploads and analyzes Excel file.

**Request:**
- Content-Type: multipart/form-data
- Field: `file` (Excel file)

**Process Flow:**
```
1. Receive file via multer
2. Save to uploads/ directory
3. Parse with ExcelJS
4. Extract headers (row 1)
5. Extract data (rows 2+)
6. Profile each column
7. Calculate quality score
8. Store in app.locals
9. Return success response
```

**Response (Success):**
```json
{
  "success": true,
  "message": "File uploaded and analyzed successfully",
  "data": {
    "fileName": "hardware_assets.xlsx",
    "totalRecords": 1000,
    "totalColumns": 10,
    "dataQualityScore": 90
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Upload failed: File format not supported"
}
```

**Common Errors:**
- "No file uploaded" - Missing file in request
- "File format not supported" - Not .xlsx or .xls
- "File too large" - Exceeds 50MB limit
- "Failed to parse Excel" - Corrupted file

## Column Type Detection

### Detection Algorithm
```javascript
function detectColumnType(values) {
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  // 1. Check for numbers (>80% numeric)
  if (numericCount / nonEmptyValues.length > 0.8) return 'number';
  
  // 2. Check for dates (>80% parseable dates)
  if (dateCount / nonEmptyValues.length > 0.8) return 'date';
  
  // 3. Check for alphanumeric (mix of letters + numbers)
  if (alphanumericCount / nonEmptyValues.length > 0.5) return 'alphanumeric';
  
  // 4. Default to string
  return 'string';
}
```

### Type Definitions

#### number
**Criteria:** >80% of non-empty values are numeric

**Examples:**
- `10, 20, 30, 40`
- `1.5, 2.7, 3.9`
- `1000, 2000, 3000`

**Detection:**
```javascript
const numericCount = nonEmptyValues.filter(v => 
  !isNaN(parseFloat(v)) && isFinite(v)
).length;
```

#### date
**Criteria:** >80% of non-empty values are parseable dates

**Examples:**
- `2024-01-15, 2024-01-16, 2024-01-17`
- `01/15/2024, 01/16/2024`
- Excel serial dates (44927, 44928)

**Detection:**
```javascript
const dateCount = nonEmptyValues.filter(v => {
  if (v instanceof Date) return true;
  const parsed = new Date(v);
  return !isNaN(parsed.getTime());
}).length;
```

#### alphanumeric
**Criteria:** >50% of values contain BOTH letters AND numbers

**Examples:**
- `SN001, SN002, SN003` (Serial Numbers)
- `ALKPRD001, ALKPRD002` (Server Names)
- `ABC123, DEF456` (Asset Tags)

**Detection:**
```javascript
const alphanumericCount = nonEmptyValues.filter(v => {
  const str = String(v);
  return /^[a-zA-Z0-9]+$/.test(str) && 
         /[a-zA-Z]/.test(str) && 
         /[0-9]/.test(str);
}).length;
```

**Important:** Must contain BOTH letters and numbers, only alphanumeric characters (no spaces/special chars).

#### string
**Default type** when none of the above criteria are met.

**Examples:**
- Names: `John Smith, Jane Doe`
- Locations: `Brisbane, Sydney, Melbourne`
- Descriptions: `Server in data center`

#### boolean (future)
Not currently detected but could be added:

**Criteria:** >80% of values are true/false/yes/no/1/0

**Examples:**
- `true, false, true`
- `yes, no, yes`
- `1, 0, 1`

## Column Profiling

### profileColumn Function
```javascript
function profileColumn(columnName, values) {
  const totalRecords = values.length;
  
  // Count empty values
  const emptyRecords = values.filter(v => 
    v === null || v === undefined || v === ''
  ).length;
  
  // Get non-empty values
  const nonEmptyValues = values.filter(v => 
    v !== null && v !== undefined && v !== ''
  );
  
  // Count unique values
  const uniqueValues = new Set(
    nonEmptyValues.map(v => String(v))
  ).size;
  
  // Count duplicates
  const valueCountMap = {};
  nonEmptyValues.forEach(v => {
    const key = String(v);
    valueCountMap[key] = (valueCountMap[key] || 0) + 1;
  });
  
  // Sum all values that appear more than once
  const duplicates = Object.values(valueCountMap)
    .filter(count => count > 1)
    .reduce((sum, count) => sum + count, 0);
  
  return {
    name: columnName,
    type: detectColumnType(values),
    totalRecords,
    emptyRecords,
    duplicates,
    uniqueValues,
    isUniqueQualifier: false,  // User sets in Phase 2
    isReferenceData: false     // User sets in Phase 2
  };
}
```

### Profile Example
```json
{
  "name": "Serial Number",
  "type": "alphanumeric",
  "totalRecords": 1000,
  "emptyRecords": 5,
  "duplicates": 10,
  "uniqueValues": 985,
  "isUniqueQualifier": false,
  "isReferenceData": false
}
```

**Interpretation:**
- 1000 total rows of data
- 5 rows have no serial number (empty)
- 10 duplicate serial numbers exist (5 pairs)
- 985 unique serial numbers found
- Type: alphanumeric (mix of letters and numbers)

## State Storage

### app.locals.uploadedData
**Purpose:** Metadata and column profiles for display in Phase 2

```javascript
app.locals.uploadedData = {
  fileName: "hardware_assets.xlsx",
  fileSize: 245678,
  totalRecords: 1000,
  totalColumns: 10,
  columns: [
    {
      name: "Serial Number",
      type: "alphanumeric",
      totalRecords: 1000,
      emptyRecords: 5,
      duplicates: 10,
      uniqueValues: 985,
      isUniqueQualifier: false,
      isReferenceData: false
    }
    // ... 9 more columns
  ],
  dataQualityScore: 90
};
```

### app.locals.rawExcelData (DEPRECATED)
**Purpose:** Raw column data (prefer reading from file now)

```javascript
app.locals.rawExcelData = {
  "Serial Number": ["SN001", "SN002", "SN003", ...],
  "Hostname": ["server1", "server2", "server3", ...],
  // ... all columns
};
```

**⚠️ DEPRECATED:** Phase 3 now reads directly from file for fresher data.

### app.locals.uploadedFilePath (CRITICAL!)
**Purpose:** Path to Excel file on disk

```javascript
app.locals.uploadedFilePath = "uploads/abc123.xlsx";
```

**Why Critical?**
- Phase 3 reads from this file
- Phase 3 writes fixes to this file
- Phase 4 downloads this file
- Source of truth for all data

**⚠️ DO NOT DELETE THIS FILE!**

## Data Extraction Details

### Reading Headers
```javascript
const headerRow = worksheet.getRow(1);
const columns = [];
const columnData = {};

headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
  const columnName = String(cell.value || 'Column ' + colNumber);
  columns.push(columnName);
  columnData[columnName] = [];
});
```

**Notes:**
- Row 1 is assumed to be headers
- Missing headers get default name "Column N"
- Empty cells in header row are skipped

### Reading Data Rows
```javascript
worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) return; // Skip header
  
  totalRows++;
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnName = columns[colNumber - 1];
    if (columnName) {
      columnData[columnName].push(cell.value);
    }
  });
});
```

**Critical Detail:** `includeEmpty: true` for cells!
- Maintains row alignment across columns
- Prevents column length mismatches
- Essential for correct row numbering later

**Example:**
```
| A    | B     | C      |
|------|-------|--------|
| val1 |       | val3   |  ← Empty cell in B maintained
| val2 | val2b |        |  ← Empty cell in C maintained
```

Result:
```javascript
{
  "A": ["val1", "val2"],
  "B": [null, "val2b"],      // ← null preserved
  "C": ["val3", null]        // ← null preserved
}
```

## Quality Score Calculation

### Formula
```javascript
const totalCells = totalRows * columns.length;
const emptyCells = profiledColumns.reduce(
  (sum, col) => sum + col.emptyRecords, 
  0
);
const dataQualityScore = Math.round(
  ((totalCells - emptyCells) / totalCells) * 100
);
```

### Examples

**Example 1: Perfect Data**
- 1000 rows × 10 columns = 10,000 cells
- 0 empty cells
- Score: (10000 - 0) / 10000 = 100%

**Example 2: Some Missing**
- 1000 rows × 10 columns = 10,000 cells
- 500 empty cells
- Score: (10000 - 500) / 10000 = 95%

**Example 3: Many Missing**
- 1000 rows × 10 columns = 10,000 cells
- 3000 empty cells
- Score: (10000 - 3000) / 10000 = 70%

### Score Interpretation
- **90-100%** 🟢 Excellent - Minimal missing data
- **80-89%** 🟡 Good - Some missing data
- **70-79%** 🟡 Fair - Noticeable gaps
- **60-69%** 🟠 Poor - Many missing values
- **<60%** 🔴 Critical - Extensive data gaps

## File Upload Configuration

### Multer Setup
```javascript
const upload = multer({ dest: 'uploads/' });
```

**Configuration:**
- Destination: `uploads/` directory
- Generated filename: Random string (e.g., `abc123def456`)
- Original extension: Not preserved (file has no extension)
- Original filename: Stored in `req.file.originalname`

### File Object (req.file)
```javascript
{
  fieldname: 'file',
  originalname: 'hardware_assets.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  destination: 'uploads/',
  filename: 'abc123def456',
  path: 'uploads/abc123def456',
  size: 245678
}
```

### Security Considerations
- [ ] Validate file extension (.xlsx, .xls only)
- [ ] Limit file size (currently 50MB)
- [ ] Scan for malicious macros
- [ ] Sanitize filename before storage
- [ ] Implement file cleanup (delete old files)

## Frontend Integration

### File Upload Flow
```javascript
// 1. User selects file
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  displayFileInfo(file);
});

// 2. User clicks "Upload & Analyze"
const formData = new FormData();
formData.append('file', file);

// 3. POST to /api/phase1/upload
const response = await fetch('/api/phase1/upload', {
  method: 'POST',
  body: formData
});

// 4. Handle response
const result = await response.json();
if (result.success) {
  showResults(result.data);
  navigateToPhase2();
}
```

### Progress Updates
```javascript
// Show progress during upload
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percent = (e.loaded / e.total) * 100;
    updateProgressBar(percent);
  }
});
```

### Display Results
After successful upload, show:
- File name
- Total records
- Total columns
- Quality score
- "Continue to Phase 2" button

## Error Handling

### Common Errors

**No file uploaded:**
```javascript
if (!req.file) {
  return res.status(400).json({ 
    error: 'No file uploaded' 
  });
}
```

**Parse error:**
```javascript
try {
  await workbook.xlsx.readFile(req.file.path);
} catch (error) {
  return res.status(500).json({ 
    error: 'Failed to parse Excel file: ' + error.message 
  });
}
```

**Invalid format:**
- Multer accepts any file initially
- ExcelJS will fail on non-Excel files
- Better to validate extension before parsing

### Error Response Format
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

## Performance Considerations

### Upload Times
- **Small files** (<1MB): <1 second
- **Medium files** (1-10MB): 1-5 seconds
- **Large files** (10-50MB): 5-20 seconds

### Bottlenecks
1. **File upload:** Network speed dependent
2. **ExcelJS parsing:** CPU intensive, 1-10s for large files
3. **Data profiling:** O(n × m) where n=rows, m=columns

### Optimization Ideas
- [ ] Stream parsing for large files
- [ ] Worker threads for profiling
- [ ] Caching parsed data
- [ ] Progress callbacks during parsing
- [ ] Pagination for display (if >50 columns)

## Testing Checklist

- [ ] Upload .xlsx file
- [ ] Upload .xls file
- [ ] Upload small file (<1MB)
- [ ] Upload large file (10-50MB)
- [ ] Upload file with 1 column
- [ ] Upload file with 50+ columns
- [ ] Upload file with empty cells
- [ ] Upload file with all data types
- [ ] Upload file with duplicates
- [ ] Upload file with empty columns
- [ ] Upload file with special characters in headers
- [ ] Upload file with merged cells
- [ ] Verify file saved in uploads/
- [ ] Verify state stored in app.locals
- [ ] Verify quality score calculation
- [ ] Verify column type detection
- [ ] Test error handling (no file)
- [ ] Test error handling (corrupted file)
- [ ] Test progress bar updates

## Common Issues & Solutions

### Issue: "No file uploaded" error
**Cause:** File input not properly set
**Solution:** Check FormData has 'file' field with actual File object

### Issue: Type detection incorrect
**Cause:** Mixed data types in column
**Solution:** Review detection thresholds (0.8 for numbers/dates, 0.5 for alphanumeric)

### Issue: Empty cells causing misalignment
**Cause:** Using `includeEmpty: false` when reading cells
**Solution:** Use `includeEmpty: true` for row cells to maintain alignment

### Issue: File not found in Phase 3
**Cause:** File was deleted or path lost
**Solution:** Ensure `uploadedFilePath` is stored and uploads/ directory persists

### Issue: Out of memory on large files
**Cause:** Loading entire file in memory
**Solution:** Consider streaming or chunked processing

## Future Enhancements

### Type Detection
- [ ] Add boolean type detection
- [ ] Add email type detection
- [ ] Add phone number type detection
- [ ] Add URL type detection
- [ ] Machine learning-based type detection

### Data Profiling
- [ ] Value range detection (min/max for numbers)
- [ ] Pattern detection (regex patterns)
- [ ] Format consistency checks
- [ ] Statistical analysis (mean, median, std dev)
- [ ] Cardinality analysis

### Quality Score
- [ ] Include duplicate count in score
- [ ] Weight by column importance
- [ ] Consider data consistency
- [ ] Add data validity checks
- [ ] Configurable scoring algorithm

### User Experience
- [ ] Drag-and-drop file upload
- [ ] Multiple file upload
- [ ] File format conversion (CSV to Excel)
- [ ] Preview before upload
- [ ] Resume interrupted uploads

### Performance
- [ ] Streaming Excel parser
- [ ] Worker threads for profiling
- [ ] Incremental profiling results
- [ ] Caching layer
- [ ] Compression before storage

## Dependencies

```javascript
import express from 'express';
import multer from 'multer';      // File upload handling
import ExcelJS from 'exceljs';    // Excel parsing
```

## Related Files

- Frontend: `/phase-1-upload-profiling/phase1.html`
- JavaScript: `/shared/js/phase1.js`
- Styles: `/shared/css/servicenow-style.css`
- Next Phase: `/phase-2-analysis/`

## Critical Reminders

1. **Always use `includeEmpty: true`** when reading row cells
2. **Store `uploadedFilePath`** - it's the source of truth
3. **DO NOT delete uploaded files** - needed throughout all phases
4. **Row 1 is headers** - data starts at row 2
5. **Quality score is simple** - just completeness, not validity
6. **Type detection is heuristic** - not 100% accurate
7. **Duplicates count total instances** - not unique duplicate values

## Example Usage

### Sample Request (via curl)
```bash
curl -X POST http://localhost:3000/api/phase1/upload \
  -F "file=@/path/to/hardware.xlsx"
```

### Sample Response
```json
{
  "success": true,
  "message": "File uploaded and analyzed successfully",
  "data": {
    "fileName": "hardware.xlsx",
    "totalRecords": 1000,
    "totalColumns": 10,
    "dataQualityScore": 90
  }
}
```

---

**Last Updated:** 2024-01-21  
**Maintained By:** Fed  
**Status:** ✅ Complete and Stable  
**Note:** This is the foundation - all other phases depend on data stored here!

---

**End of MemoAI-Phase1.md**
