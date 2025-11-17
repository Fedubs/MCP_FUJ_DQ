# MemoAI - Phase 1: Upload & Data Profiling

## Phase Purpose
Handle Excel file upload, extract data, and perform initial data profiling to understand the dataset structure, patterns, and baseline quality.

## Current Implementation Status
✅ **UI Complete** - Upload interface with drag & drop working
🚧 **Backend** - Mock data only, real Excel parsing needed

## Responsibilities

### 1. File Upload ✅
- Accept Excel file uploads (.xlsx, .xls)
- Validate file format and readability
- Handle file size limitations (50MB max)
- Provide user feedback on upload status
- Drag & drop functionality
- Progress bar animation

### 2. Data Extraction 🚧
**TODO**: Implement with ExcelJS
- Parse Excel sheets
- Extract all rows and columns  
- Identify header rows
- Handle multiple sheets if present
- Preserve data types where possible

### 3. Data Profiling 🚧
**TODO**: Implement profiling logic
- **Column Analysis**:
  - Detect column names and data types
  - Count total rows per column
  - Identify empty/null values
  - Calculate fill rates (% of populated cells)
  
- **Pattern Detection**:
  - Common value patterns
  - Data format patterns (dates, IDs, codes)
  - Unique value counts
  - Value distribution analysis
  
- **Statistical Analysis**:
  - Most common values per column
  - Outliers and anomalies
  - Duplicate row detection
  - Data consistency checks

### 4. Initial Data Quality Score 🚧
**TODO**: Calculate baseline quality score based on:
- Completeness (missing data %)
- Consistency (pattern adherence)
- Uniqueness (duplicate rate)
- Validity (data type correctness)

## Current API Endpoints

### Upload File
```
POST /api/phase1/upload
Content-Type: multipart/form-data

Body: file (Excel file)

Response (Mock):
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileName": "assets.xlsx",
    "totalRecords": 1500,
    "totalColumns": 12,
    "dataQualityScore": 72.5
  }
}
```

### Get Phase 1 Content
```
GET /api/phase1/content
Returns: HTML content for Phase 1 UI
```

## Frontend JavaScript
**File**: `shared/js/phase1.js`

### Key Functions
- `init()` - Initialize phase, setup event listeners
- `setupEventListeners()` - File input and drag/drop handlers
- `handleFileSelect(file)` - Validate and process selected file
- `displayFileInfo(file)` - Show file details in UI
- `startUpload()` - Upload file to server
- `animateProgress()` - Show upload progress
- `completeProgress()` - Handle upload completion

## UI Components

### Upload Area
- Drag & drop zone
- File input button
- File validation (type, size)
- File info display (name, size)
- Remove file button

### Progress Indicator
- Progress bar
- Percentage display
- Upload status messages

### Info Box
- Supported formats list
- File size limit info

### Action Buttons
- Upload & Analyze (disabled until file selected)
- Cancel

## Next Steps for Full Implementation

### 1. Install ExcelJS
```bash
npm install exceljs
```

### 2. Update server.js Upload Handler
```javascript
import ExcelJS from 'exceljs';

app.post('/api/phase1/upload', upload.single('file'), async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        const worksheet = workbook.getWorksheet(1);
        const columns = [];
        const data = [];
        
        // Extract headers
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            columns.push({
                name: cell.value,
                index: colNumber
            });
        });
        
        // Extract data
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    const columnName = columns[colNumber - 1].name;
                    rowData[columnName] = cell.value;
                });
                data.push(rowData);
            }
        });
        
        // Perform profiling
        const profiledColumns = profileColumns(data, columns);
        
        // Calculate quality score
        const qualityScore = calculateQualityScore(profiledColumns);
        
        // Store data for Phase 2
        storeUploadedData({
            fileName: req.file.originalname,
            fileSize: req.file.size,
            columns: profiledColumns,
            data: data,
            totalRecords: data.length,
            qualityScore: qualityScore
        });
        
        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                totalRecords: data.length,
                totalColumns: columns.length,
                dataQualityScore: qualityScore
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 3. Implement Profiling Functions
```javascript
function profileColumns(data, columns) {
    return columns.map(col => {
        const values = data.map(row => row[col.name]);
        
        return {
            name: col.name,
            type: detectColumnType(values),
            totalRecords: values.length,
            emptyRecords: values.filter(v => !v).length,
            uniqueValues: new Set(values.filter(v => v)).size,
            duplicates: values.length - new Set(values).size,
            topValues: getTopValues(values, 5)
        };
    });
}

function detectColumnType(values) {
    // Implement type detection logic
    // Check for numbers, dates, strings, etc.
}

function calculateQualityScore(columns) {
    // Implement quality scoring algorithm
}
```

### 4. Data Storage Strategy
Options:
- **In-memory** (simple, lost on restart)
- **Session storage** (per user session)
- **Database** (persistent, scalable)
- **File system** (JSON files)

Recommended: Start with in-memory for MVP

```javascript
// Simple in-memory storage
let uploadedData = null;

function storeUploadedData(data) {
    uploadedData = data;
}

function getUploadedData() {
    return uploadedData;
}
```

### 5. Update Phase 2 to Load This Data
In Phase 2 API endpoint:
```javascript
app.get('/api/phase2/columns', (req, res) => {
    const data = getUploadedData();
    if (!data) {
        return res.status(404).json({ error: 'No data uploaded' });
    }
    res.json(data);
});
```

## Success Criteria
- ✅ Successfully parse any valid Excel file
- ✅ Accurate column detection and profiling
- ✅ Clear, actionable profiling report
- ✅ Baseline quality score calculated
- ✅ No data loss during extraction
- ✅ Data available to Phase 2

## Technologies
- **Backend**: Express.js with Multer for file uploads
- **Excel Parsing**: ExcelJS
- **Frontend**: Vanilla JavaScript
- **File Storage**: Multer (uploads/ directory)

## User Flow
1. User lands on Phase 1
2. User drags/drops or selects Excel file
3. File is validated (type, size)
4. File info displayed
5. User clicks "Upload & Analyze"
6. Progress bar shows upload status
7. Server parses Excel file
8. Server profiles columns
9. Server calculates quality score
10. User sees success message with summary
11. User clicks to proceed to Phase 2

---
*Phase Owner: Fed*  
*Last Updated: November 12, 2025*
