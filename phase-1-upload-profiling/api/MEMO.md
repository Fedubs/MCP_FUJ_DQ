# PHASE 1: UPLOAD & PROFILING - MEMO

**Location:** `phase-1-upload-profiling/api/routes.js`

## Overview
Phase 1 handles Excel file uploads and performs initial data profiling. This is the entry point where users upload their data files.

## What This Phase Does

### 1. File Upload
- Accepts Excel files (.xlsx, .xls)
- Stores uploaded file in `uploads/` directory
- **Important:** File is NOT deleted after processing (needed for Phase 3 file-based storage)

### 2. Data Extraction
- Reads Excel file using ExcelJS library
- Extracts column headers from first row
- Reads all data rows (skipping header)
- Organizes data by column name

### 3. Data Profiling
- Analyzes each column:
  - **Column Type Detection:** string, number, date, alphanumeric, boolean
  - **Total Records:** Count of all rows
  - **Empty Records:** Count of null/undefined/empty values
  - **Duplicates:** Count of repeated values
  - **Unique Values:** Count of distinct values

### 4. Quality Score Calculation
```javascript
Quality Score = ((Total Cells - Empty Cells) / Total Cells) * 100
```
Example: 1000 cells, 100 empty = 90% quality score

## API Endpoints

### GET `/api/phase1/content`
- Returns HTML content for Phase 1 UI
- Includes upload form, drag-drop zone, file info display
- Shows "What Happens Next" instructions

### POST `/api/phase1/upload`
**Request:**
- Form data with file field: `file`
- Accepts: .xlsx, .xls

**Response:**
```json
{
  "success": true,
  "message": "File uploaded and analyzed successfully",
  "data": {
    "fileName": "example.xlsx",
    "totalRecords": 1000,
    "totalColumns": 10,
    "dataQualityScore": 90
  }
}
```

## Data Storage

### What Gets Stored in `app.locals`:
```javascript
app.locals.uploadedData = {
  fileName: "example.xlsx",
  fileSize: 245678,
  totalRecords: 1000,
  totalColumns: 10,
  columns: [
    {
      name: "Hostname",
      type: "alphanumeric",
      totalRecords: 1000,
      emptyRecords: 5,
      duplicates: 10,
      uniqueValues: 990,
      isUniqueQualifier: false,
      isReferenceData: false
    },
    // ... more columns
  ],
  dataQualityScore: 90
};

app.locals.rawExcelData = {
  "Hostname": ["server1", "server2", ...],
  "IP Address": ["10.0.0.1", "10.0.0.2", ...],
  // ... all columns with their data
};

app.locals.uploadedFilePath = "uploads/abc123.xlsx";
```

## Helper Functions

### `detectColumnType(values)`
Detects the data type of a column based on its values.

**Logic:**
1. If 80%+ are numbers → `number`
2. If 80%+ are dates → `date`
3. If 50%+ are alphanumeric (letters + numbers) → `alphanumeric`
4. Default → `string`

**Example:**
```javascript
["server1", "server2", "DB001"] → "alphanumeric"
[100, 200, 300] → "number"
["2024-01-01", "2024-01-02"] → "date"
```

### `profileColumn(columnName, values)`
Analyzes a column and returns profiling statistics.

**Returns:**
```javascript
{
  name: "Hostname",
  type: "alphanumeric",
  totalRecords: 1000,
  emptyRecords: 5,
  duplicates: 10,
  uniqueValues: 990,
  isUniqueQualifier: false,
  isReferenceData: false
}
```

## Key Implementation Details

### ✅ File Persistence (CRITICAL!)
```javascript
// DON'T DELETE THE FILE!
// Old code: await fs.unlink(req.file.path);
// New code: Keep file for Phase 3
uploadedFilePath = req.file.path;
```

**Why?** Phase 3 needs to read and write to the original Excel file to persist changes.

### Column Data Extraction
```javascript
worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) return; // Skip header
  
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnName = columns[colNumber - 1];
    columnData[columnName].push(cell.value);
  });
});
```

**Important:** We include empty cells to maintain row alignment!

## Flow Diagram

```
User uploads file
       ↓
Multer saves to uploads/
       ↓
ExcelJS reads file
       ↓
Extract headers (row 1)
       ↓
Extract data (rows 2+)
       ↓
Profile each column
  - Detect type
  - Count empty
  - Count duplicates
  - Count unique values
       ↓
Calculate quality score
       ↓
Store in app.locals:
  - uploadedData
  - rawExcelData
  - uploadedFilePath
       ↓
Return success response
       ↓
User proceeds to Phase 2
```

## Common Issues & Solutions

### Issue: File not found in Phase 3
**Cause:** File was deleted after upload
**Solution:** Ensure `uploadedFilePath` is set and file is NOT deleted

### Issue: Wrong column types detected
**Cause:** Mixed data in columns
**Solution:** Adjust detection thresholds in `detectColumnType()`

### Issue: Empty cells not counted correctly
**Cause:** Not including empty cells in eachCell()
**Solution:** Use `{ includeEmpty: true }`

## Dependencies

```javascript
import multer from 'multer';        // File upload handling
import ExcelJS from 'exceljs';      // Excel file parsing
```

## Testing Checklist

- [ ] Upload .xlsx file works
- [ ] Upload .xls file works
- [ ] Drag and drop works
- [ ] File info displays correctly
- [ ] Progress bar updates
- [ ] Quality score calculates correctly
- [ ] Column types detected accurately
- [ ] Empty records counted correctly
- [ ] Duplicates counted correctly
- [ ] File persists for Phase 3
- [ ] Data stored in app.locals
- [ ] Error handling for invalid files
- [ ] Large files (>10MB) work

## Future Enhancements

1. **Multiple Sheet Support:** Currently only reads first worksheet
2. **File Size Validation:** Add 50MB limit check
3. **File Type Validation:** Verify MIME type
4. **Progress Streaming:** Real-time upload progress
5. **Column Type Override:** Let users manually set column types
6. **Data Sampling:** For huge files, sample every Nth row
7. **Compression:** Compress stored raw data
8. **Multiple File Upload:** Batch processing

## Performance Notes

- **Small files (<1MB):** < 1 second
- **Medium files (1-10MB):** 1-5 seconds
- **Large files (10-50MB):** 5-20 seconds

**Bottleneck:** ExcelJS parsing for large files

## Security Considerations

⚠️ **File Upload Risks:**
- [ ] Validate file extensions
- [ ] Scan for malicious macros
- [ ] Limit file size
- [ ] Sanitize file names
- [ ] Store in isolated directory
- [ ] Clean up old files periodically

## Related Files

- Frontend: `/phase-1-upload-profiling/phase1.html`
- JavaScript: `/shared/js/phase1.js`
- Styles: `/shared/css/servicenow-style.css`

---

**Last Updated:** 2024-01-21
**Maintained By:** Fed
**Questions?** Check DEPLOYMENT_COMPLETE.md
