# PHASE 2: ANALYSIS & CONFIGURATION - MEMO

**Location:** `phase-2-analysis/api/routes.js`

## Overview
Phase 2 displays profiled column data and allows users to configure columns before remediation. Users mark columns as "Unique Qualifiers" or "Reference Data" and can save configurations for reuse.

## What This Phase Does

### 1. Display Column Analysis
- Shows all columns with their profiling stats
- Visual quality indicators (empty records, duplicates)
- Color-coded severity badges

### 2. Column Configuration
- **Unique Qualifier:** Mark columns that should have unique values (e.g., Serial Number, Hostname)
- **Reference Data:** Mark columns that reference ServiceNow CMDB (e.g., CI names, Location names)

### 3. Configuration Persistence
- Auto-saves configuration for Phase 3
- Optional: Save with custom name for reuse
- Stores in `app.locals.phase3Configuration`

## API Endpoints

### GET `/api/phase2/content`
Returns HTML content for Phase 2 UI with:
- Quality score widget (persistent across phases)
- Column cards grid
- Configuration form
- "Continue to Phase 3" button

### GET `/api/phase2/columns`
**Request:** None

**Response:**
```json
{
  "fileName": "hardware_assets.xlsx",
  "fileSize": 245678,
  "totalRecords": 1000,
  "totalColumns": 10,
  "columns": [
    {
      "name": "Serial Number",
      "type": "alphanumeric",
      "totalRecords": 1000,
      "emptyRecords": 0,
      "duplicates": 0,
      "uniqueValues": 1000,
      "isUniqueQualifier": false,
      "isReferenceData": false
    },
    // ... more columns
  ],
  "dataQualityScore": 90
}
```

**Error Response:**
```json
{
  "error": "No file uploaded. Please upload a file in Phase 1 first."
}
```

### POST `/api/phase2/auto-save-for-phase3`
Automatically saves user configuration when proceeding to Phase 3.

**Request Body:**
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
      "isUniqueQualifier": true,    // User marked as unique
      "isReferenceData": false
    },
    {
      "name": "Location",
      "type": "string",
      "totalRecords": 1000,
      "emptyRecords": 50,
      "duplicates": 200,
      "uniqueValues": 25,
      "isUniqueQualifier": false,
      "isReferenceData": true      // User marked as reference data
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved for Phase 3"
}
```

## Data Storage

### What Gets Stored:
```javascript
app.locals.phase3Configuration = {
  fileName: "hardware_assets.xlsx",
  dataQualityScore: 90,
  columns: [
    {
      name: "Serial Number",
      type: "alphanumeric",
      totalRecords: 1000,
      emptyRecords: 0,
      duplicates: 0,
      uniqueValues: 1000,
      isUniqueQualifier: true,     // ← User configured
      isReferenceData: false
    },
    // ... all columns with user settings
  ]
};
```

## User Interactions (Frontend)

### Column Card Display
Each column shows:
```
┌─────────────────────────────────┐
│ 📊 Hostname (ALPHANUMERIC)      │
├─────────────────────────────────┤
│ Total Records:    1000          │
│ Empty Records:    5    (🟡 1%)  │
│ Duplicates:       10   (🟡 1%)  │
│ Unique Values:    990           │
├─────────────────────────────────┤
│ ☐ Unique Qualifier              │
│ ☐ Reference Data                │
└─────────────────────────────────┘
```

### Severity Indicators
- 🔴 **Critical** (>20% empty or unique qualifier with duplicates)
- 🟡 **Warning** (5-20% empty)
- 🟢 **Info** (<5% empty)

## Configuration Rules

### Unique Qualifier
**What it means:** Values in this column should be unique

**Examples:**
- Serial Number
- Hostname
- CI Name
- Asset Tag
- Employee ID

**Impact on Phase 3:**
- If duplicates exist → CRITICAL priority action
- "Remove Duplicates" action appears first
- Higher severity for duplicate issues

### Reference Data
**What it means:** Values reference ServiceNow CMDB records

**Examples:**
- Location (references cmn_location)
- Assigned To (references sys_user)
- Department (references cmn_department)
- Company (references core_company)

**Impact on Phase 3:**
- Special "Validate Against ServiceNow" action added
- Can check if values exist in CMDB
- Suggests creating missing records

## Flow Diagram

```
User lands on Phase 2
       ↓
Load configuration from app.locals.uploadedData
       ↓
Display quality widget
  - File name
  - Total records
  - Total columns
  - Quality score
       ↓
Render column cards
  For each column:
    - Show profiling stats
    - Show checkboxes
       ↓
User reviews columns
       ↓
User checks boxes:
  ☑ Unique Qualifier
  ☑ Reference Data
       ↓
Optional: Enter config name
       ↓
Click "Continue to Phase 3"
       ↓
Auto-save config to app.locals
       ↓
Redirect to Phase 3
```

## Key Implementation Details

### Data Flow from Phase 1
```javascript
// Phase 1 stored this:
app.locals.uploadedData = { ... };

// Phase 2 reads it:
const uploadedData = req.app.locals.uploadedData;

// Phase 2 enhances it with user config:
app.locals.phase3Configuration = req.body;
```

### Configuration Structure
The configuration is essentially the same as uploadedData, but with:
- User-modified `isUniqueQualifier` flags
- User-modified `isReferenceData` flags
- Optional custom configuration name

## Common Issues & Solutions

### Issue: "No file uploaded" error
**Cause:** User navigated directly to Phase 2 without uploading
**Solution:** Check if `app.locals.uploadedData` exists, redirect to Phase 1

### Issue: Configuration not saved
**Cause:** User navigated away before clicking "Continue"
**Solution:** Add auto-save on checkbox change

### Issue: Lost configuration on refresh
**Cause:** app.locals is in-memory only
**Solution:** Consider using sessions or database storage

## Dependencies

```javascript
import express from 'express';  // Web framework
// No other dependencies - uses data from Phase 1
```

## Testing Checklist

- [ ] Displays data from Phase 1
- [ ] Shows all columns
- [ ] Quality widget updates correctly
- [ ] Can check "Unique Qualifier" checkbox
- [ ] Can check "Reference Data" checkbox
- [ ] Can enter configuration name
- [ ] Configuration saves when clicking "Continue"
- [ ] Redirects to Phase 3 after save
- [ ] Error handling for missing Phase 1 data
- [ ] Works with 1 column
- [ ] Works with 50+ columns

## Frontend Integration

### Quality Widget (Persistent)
The quality widget appears in Phase 2, 3, and 4. It shows:
- Current quality score
- Total records/columns
- File name
- File size

**Data binding:**
```javascript
document.getElementById('widgetQualityScore').textContent = data.dataQualityScore;
document.getElementById('widgetTotalRecords').textContent = data.totalRecords;
// ... etc
```

### Column Cards
Dynamic HTML generation for each column:
```html
<div class="column-card">
  <div class="column-header">
    <h3>Hostname</h3>
    <span class="badge">ALPHANUMERIC</span>
  </div>
  <div class="column-stats">
    <div>Total: 1000</div>
    <div>Empty: 5 (1%)</div>
    <div>Duplicates: 10 (1%)</div>
  </div>
  <div class="column-config">
    <label>
      <input type="checkbox" name="isUniqueQualifier">
      Unique Qualifier
    </label>
    <label>
      <input type="checkbox" name="isReferenceData">
      Reference Data
    </label>
  </div>
</div>
```

## Configuration Save Logic

### Auto-save (on "Continue to Phase 3")
```javascript
// Frontend collects all column configurations
const columns = Array.from(columnCards).map(card => ({
  ...originalColumnData,
  isUniqueQualifier: card.querySelector('[name="isUniqueQualifier"]').checked,
  isReferenceData: card.querySelector('[name="isReferenceData"]').checked
}));

// POST to auto-save endpoint
fetch('/api/phase2/auto-save-for-phase3', {
  method: 'POST',
  body: JSON.stringify({ fileName, dataQualityScore, columns })
});
```

### Manual save (with configuration name)
```javascript
// Same as above, but also includes configName
const configName = document.getElementById('configName').value;
// Save to database/file for future reuse
```

## Phase Transitions

### From Phase 1 to Phase 2
Phase 1 uploads file → stores `uploadedData` → user clicks "Continue" → Phase 2 displays

### From Phase 2 to Phase 3
Phase 2 configures columns → auto-saves `phase3Configuration` → user clicks "Continue" → Phase 3 loads

## Future Enhancements

1. **Save Named Configurations**
   - Store configurations in database
   - Load previous configs by name
   - "Apply Config Template" feature

2. **Batch Configuration**
   - Select all columns → Set all as Unique
   - Pattern matching: "ID" → Unique Qualifier
   - Smart suggestions based on column name

3. **Column Preview**
   - Click column → View sample values
   - See data distribution
   - Quick fix suggestions

4. **Import/Export Configs**
   - Export config as JSON
   - Import config from file
   - Share configs between users

5. **Validation Rules**
   - Add custom validation rules per column
   - Regex patterns
   - Value ranges
   - Allowed values list

6. **Column Grouping**
   - Group related columns
   - Apply settings to group
   - Dependency rules (if column A is unique, column B must be...)

## Performance Notes

- Lightweight phase - no heavy computation
- Render time: <100ms for 50 columns
- Configuration save: <50ms

## Security Considerations

⚠️ **Input Validation:**
- [ ] Validate configuration name (XSS prevention)
- [ ] Limit configuration size
- [ ] Sanitize user inputs

## Related Files

- Frontend: `/phase-2-analysis/phase2.html`
- JavaScript: `/shared/js/phase2.js`
- Styles: `/shared/css/servicenow-style.css`
- Next Phase: `/phase-3-ai-remediation/`

## Configuration Example

```json
{
  "fileName": "cmdb_ci_hardware.xlsx",
  "dataQualityScore": 85,
  "columns": [
    {
      "name": "Serial Number",
      "type": "alphanumeric",
      "totalRecords": 5000,
      "emptyRecords": 0,
      "duplicates": 0,
      "uniqueValues": 5000,
      "isUniqueQualifier": true,    // ← Will trigger CRITICAL if duplicates found
      "isReferenceData": false
    },
    {
      "name": "Location",
      "type": "string",
      "totalRecords": 5000,
      "emptyRecords": 500,
      "duplicates": 4000,
      "uniqueValues": 50,
      "isUniqueQualifier": false,
      "isReferenceData": true       // ← Will add ServiceNow validation action
    },
    {
      "name": "Asset Tag",
      "type": "alphanumeric",
      "totalRecords": 5000,
      "emptyRecords": 100,
      "duplicates": 50,
      "uniqueValues": 4850,
      "isUniqueQualifier": true,    // ← Duplicates will be CRITICAL
      "isReferenceData": false
    }
  ]
}
```

---

**Last Updated:** 2024-01-21
**Maintained By:** Fed
**Questions?** Check Phase 1 MEMO or DEPLOYMENT_COMPLETE.md
