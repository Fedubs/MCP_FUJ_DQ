# MemoAI - Phase 2: Column Analysis & Configuration

## Phase Purpose
Allow users to review profiled columns, configure data types, mark unique qualifiers, and flag reference data for ServiceNow integration.

## Current Implementation Status
✅ **UI Complete** - Quality widget, column cards, configuration working
✅ **Mock Data** - Sample columns displaying correctly
🚧 **Integration** - Need to load actual data from Phase 1

## Responsibilities

### 1. Display Data Quality Overview ✅
- **Quality Score Widget**: Large percentage display (currently hardcoded 100%)
- **File Statistics**:
  - Total Records
  - Total Columns  
  - File Name
  - File Size
- Beautiful gradient styling
- Shared with Phase 3

### 2. Column Configuration ✅
For each column, display:
- **Column Name**: Header from Excel
- **Data Type Selector**: Dropdown with options:
  - String
  - Number
  - Date
  - Alpha-numeric
  - Boolean
- **Statistics**:
  - Total Records (black)
  - Empty Records (yellow/warning)
  - Duplicates (yellow/red if unique qualifier)
  - Unique Values (green/success)
- **Checkboxes**:
  - Include in Unique Qualifier (multiple columns can be checked)
  - Reference Data (ServiceNow Check)
- **Remove Column Button**: ✕ to exclude column from processing

### 3. Save Configuration ✅
- Input field for configuration name
- Save button to persist settings
- Configurations can be reloaded later
- Continue to Phase 3 button

## Current API Endpoints

### Get Phase 2 Content
```
GET /api/phase2/content
Returns: HTML content for Phase 2 UI
```

### Get Column Data
```
GET /api/phase2/columns

Response (Mock):
{
  "fileName": "sample_assets.xlsx",
  "fileSize": 45600,
  "totalRecords": 1500,
  "columns": [
    {
      "name": "Manufacturer",
      "type": "string",
      "totalRecords": 1500,
      "emptyRecords": 25,
      "duplicates": 450,
      "uniqueValues": 45,
      "isUniqueQualifier": false,
      "isReferenceData": true
    },
    // ... more columns
  ]
}
```

## Frontend JavaScript
**File**: `shared/js/phase2.js`

### Key Functions
- `init()` - Initialize phase, load data
- `loadUploadedData()` - Fetch column data from API
- `renderColumns()` - Create column cards in grid
- `attachColumnEventListeners()` - Setup interactivity
- `removeColumn(index)` - Remove column from analysis
- `updateColumnCount()` - Update widget statistics
- `saveConfiguration()` - Save user's configuration choices

### State Management
```javascript
{
  columns: [],           // Array of column objects
  fileData: null,        // Uploaded file metadata
  configuration: {
    name: '',            // User-provided config name
    columnSettings: []   // Array of column configurations
  }
}
```

## UI Components

### Quality Widget
```html
<div class="quality-widget">
  <!-- Score circle with 100% -->
  <!-- Stats grid with file info -->
</div>
```

### Column Cards Grid
```html
<div class="columns-grid">
  <div class="column-card">
    <!-- Column name & type selector -->
    <!-- Statistics row -->
    <!-- Checkbox options -->
    <!-- Remove button -->
  </div>
</div>
```

### Configuration Form
```html
<div class="config-form">
  <input id="configName" placeholder="Config name" />
  <button id="saveConfigBtn">Save Configuration</button>
  <button onclick="navigate to Phase 3">Continue →</button>
</div>
```

## CSS Classes
Defined in `shared/css/servicenow-style.css`:
- `.quality-widget` - Overall widget container
- `.quality-score` - Score circle display
- `.score-circle` - Circular progress indicator
- `.quality-stats` - Stats grid
- `.columns-grid` - Grid layout for column cards
- `.column-card` - Individual column card
- `.column-type-select` - Type dropdown
- `.column-stats` - Statistics display
- `.column-options` - Checkbox container
- `.config-form` - Configuration input form

## Data Flow

### Current (Mock Data)
```
User navigates to Phase 2
  ↓
phase2.js init()
  ↓
Fetch /api/phase2/columns
  ↓
Server returns mock data
  ↓
Render column cards
  ↓
User interacts (change type, check boxes)
  ↓
User saves configuration
  ↓
Alert confirmation
```

### Target (Real Data)
```
User uploads in Phase 1
  ↓
Phase 1 stores profiled data
  ↓
User navigates to Phase 2
  ↓
phase2.js init()
  ↓
Fetch /api/phase2/columns
  ↓
Server returns REAL uploaded data
  ↓
Render column cards with actual stats
  ↓
User configures columns
  ↓
User saves configuration
  ↓
POST /api/phase2/save-configuration
  ↓
Configuration stored
  ↓
Continue to Phase 3
```

## Next Steps for Integration

### 1. Connect to Phase 1 Data
Update `server.js`:
```javascript
app.get('/api/phase2/columns', (req, res) => {
    const data = getUploadedData(); // From Phase 1
    
    if (!data) {
        return res.status(404).json({ 
            error: 'No file uploaded. Please upload a file in Phase 1.' 
        });
    }
    
    res.json({
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalRecords: data.totalRecords,
        columns: data.columns // Already profiled in Phase 1
    });
});
```

### 2. Implement Save Configuration
Add endpoint in `server.js`:
```javascript
app.post('/api/phase2/save-configuration', (req, res) => {
    const configuration = req.body;
    
    // Validate
    if (!configuration.name) {
        return res.status(400).json({ error: 'Configuration name required' });
    }
    
    // Store configuration
    // Options: File system, database, or in-memory
    storeConfiguration(configuration);
    
    // Also update the uploaded data with user's column settings
    updateColumnSettings(configuration.columnSettings);
    
    res.json({
        success: true,
        message: `Configuration "${configuration.name}" saved successfully`
    });
});
```

### 3. Configuration Storage
Simple file-based approach:
```javascript
import fs from 'fs/promises';
import path from 'path';

async function storeConfiguration(config) {
    const configDir = path.join(__dirname, 'configurations');
    await fs.mkdir(configDir, { recursive: true });
    
    const fileName = `${config.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    const filePath = path.join(configDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    
    return fileName;
}
```

### 4. Load Saved Configurations
Add endpoint to list configurations:
```javascript
app.get('/api/configurations', async (req, res) => {
    const configDir = path.join(__dirname, 'configurations');
    const files = await fs.readdir(configDir);
    
    const configurations = await Promise.all(
        files.map(async file => {
            const content = await fs.readFile(
                path.join(configDir, file), 
                'utf-8'
            );
            return JSON.parse(content);
        })
    );
    
    res.json(configurations);
});
```

### 5. Apply Configuration
Add UI to select saved configuration:
```javascript
// In phase2.js
async loadSavedConfigurations() {
    const response = await fetch('/api/configurations');
    const configs = await response.json();
    
    // Show dropdown to select configuration
    // When selected, apply settings to current columns
}

applyConfiguration(config) {
    config.columnSettings.forEach(setting => {
        const column = this.columns.find(c => c.name === setting.name);
        if (column) {
            column.type = setting.type;
            column.isUniqueQualifier = setting.isUniqueQualifier;
            column.isReferenceData = setting.isReferenceData;
        }
    });
    
    this.renderColumns();
}
```

## Unique Qualifier Logic
- Multiple columns can be marked as unique qualifiers
- These columns together form a composite key
- Example: `Manufacturer + Model + Serial Number`
- Used in Phase 3 for duplicate detection
- Critical for data quality scoring

## Reference Data Logic
- Marks columns that should be validated against ServiceNow
- Example: `Manufacturer`, `Location`, `Department`
- Phase 3 will check these against ServiceNow tables
- Helps ensure data consistency with CMDB

## Success Criteria
- ✅ Display all columns from uploaded file
- ✅ Show accurate statistics per column
- ✅ Allow type modification
- ✅ Support multiple unique qualifiers
- ✅ Mark reference data columns
- ✅ Save and reload configurations
- ✅ Remove unwanted columns
- ✅ Pass configured data to Phase 3

## User Flow
1. User enters Phase 2 (after uploading in Phase 1)
2. Quality widget shows overall score and file info
3. Column cards display for each column
4. User reviews auto-detected types
5. User adjusts types if needed
6. User marks unique qualifier columns (e.g., Serial Number)
7. User marks reference data columns (e.g., Manufacturer)
8. User removes any unwanted columns
9. User enters configuration name
10. User clicks "Save Configuration"
11. Configuration saved for future use
12. User clicks "Continue to Phase 3 →"

---
*Phase Owner: Fed*  
*Last Updated: November 12, 2025*
