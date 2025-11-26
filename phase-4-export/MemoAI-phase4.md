# MemoAI - Phase 4: Export Clean Data

**Status**: ✅ IN PROGRESS  
**Last Updated**: November 24, 2025

---

## Overview

Phase 4 provides the final review and export of cleaned data. Users can see all changes made during Phase 3 remediation, review rows marked for deletion, and download the cleaned Excel file ready for ServiceNow import.

---

## Key Features

### 1. Data Review Table
- Shows ALL data rows with color-coded cells based on changes
- Color coding:
  - **White** - Unchanged (no action taken)
  - **Yellow** - Changed (value was modified)
  - **Green** - Kept (user explicitly kept original)
  - **Blue** - Edited (user manually edited in Phase 4)
  - **Red** - Deleted (row marked for deletion)

### 2. Deleted Row Highlighting (NEW: Nov 23)
Rows marked for deletion in Phase 3 are highlighted in RED:
- Light red background (`#ffebee`)
- Red left border (4px solid `#f44336`)
- Strikethrough text
- "🗑️ DUPLICATE" badge
- Edit button disabled
- Warning banner showing count: "X rows will be deleted on export"

### 3. Metadata Column Handling
Two metadata columns are used internally but hidden from users:
- `_CHANGES_LOG` - Tracks all cell-level changes
- `_ROW_DELETE` - Marks rows for deletion

**Important:** These columns are:
- ✅ Read for displaying change information
- ✅ Hidden from the UI table headers
- ✅ Removed completely on export

### 4. Export Functionality
When user clicks "Download Cleaned File":
1. Load Excel file from disk
2. Find all rows with `_ROW_DELETE` marker
3. Delete rows from BOTTOM to TOP (preserves indices)
4. Remove `_ROW_DELETE` column
5. Remove `_CHANGES_LOG` column
6. Save as `filename_CLEANED.xlsx`
7. Download to user

---

## API Endpoints

### GET /api/phase4/get-changes
**Purpose:** Load data with parsed metadata for display

**Response:**
```javascript
{
    headers: ["Name", "Email", "Serial"],  // NO _CHANGES_LOG or _ROW_DELETE
    rows: [
        {
            rowNumber: 2,
            markedForDeletion: false,
            cells: {
                "Name": { value: "John", action: "unchanged" },
                "Email": { value: "john@gmail.com", action: "changed" },
                "Serial": { value: "SN001", action: "unchanged" }
            }
        },
        {
            rowNumber: 3,
            markedForDeletion: true,  // This row is marked for deletion
            cells: {
                "Name": { value: "Jane", action: "deleted" },
                "Email": { value: "jane@gmail.com", action: "deleted" },
                "Serial": { value: "SN001", action: "deleted" }  // Duplicate!
            }
        }
    ],
    statistics: {
        totalRows: 100,
        changedRows: 15,
        deletedRows: 4,
        unchangedRows: 81
    }
}
```

### POST /api/phase4/export
**Purpose:** Generate clean file and download

**Process:**
```javascript
// 1. Load Excel
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(uploadedFilePath);
const worksheet = workbook.worksheets[0];

// 2. Find rows to delete (collect from bottom to top)
const rowsToDelete = [];
worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const deleteCell = row.getCell(rowDeleteIndex);
    if (deleteCell.value) {
        rowsToDelete.push(rowNumber);
    }
});

// 3. Delete from bottom to top (critical for index preservation)
rowsToDelete.sort((a, b) => b - a);  // Descending order
rowsToDelete.forEach(rowNum => {
    worksheet.spliceRows(rowNum, 1);
});

// 4. Remove metadata columns
// Find and remove _ROW_DELETE
worksheet.spliceColumns(rowDeleteIndex, 1);
// Find and remove _CHANGES_LOG
worksheet.spliceColumns(changesLogIndex, 1);

// 5. Save clean file
const cleanedPath = `uploads/${fileName}_CLEANED.xlsx`;
await workbook.xlsx.writeFile(cleanedPath);

// 6. Download
res.download(cleanedPath);
```

---

## Frontend Implementation

### File: `shared/js/phase4.js`

**Key Functions:**
```javascript
// Load and display data
async loadData() {
    const response = await fetch('/api/phase4/get-changes');
    const data = await response.json();
    this.renderTable(data);
    this.renderStatistics(data.statistics);
}

// Render table with color coding
renderTable(data) {
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Check if row is marked for deletion
        if (row.markedForDeletion) {
            tr.classList.add('row-delete');
        }
        
        // Render each cell with action-based styling
        Object.entries(row.cells).forEach(([colName, cell]) => {
            const td = document.createElement('td');
            td.textContent = cell.value;
            td.classList.add(`cell-${cell.action}`);
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

// Handle export
async exportFile() {
    const response = await fetch('/api/phase4/export', { method: 'POST' });
    // Triggers file download
}
```

---

## CSS Classes

### File: `shared/css/servicenow-style.css`

```css
/* Row marked for deletion - RED highlight */
.row-delete {
    background-color: #ffebee !important;
    border-left: 4px solid #f44336;
}

.row-delete td {
    text-decoration: line-through;
    font-style: italic;
    color: #999;
}

/* Deletion badge */
.badge-delete {
    background: #ffebee;
    color: #f44336;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid #f44336;
}

.badge-delete::before {
    content: '🗑️';
    margin-right: 4px;
}

/* Edit button disabled for deleted rows */
.row-delete .btn-icon {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
}

/* Cell action colors */
.cell-unchanged { background: transparent; }
.cell-changed { background: #fff3cd; }  /* Yellow */
.cell-kept { background: #d4edda; }     /* Green */
.cell-edited { background: #cce5ff; }   /* Blue */
.cell-deleted { background: #f8d7da; }  /* Red */

/* Deletion warning banner */
.deletion-warning {
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.deletion-warning-icon {
    font-size: 2rem;
    color: #f44336;
}

.deletion-warning-count {
    font-size: 1.5rem;
    font-weight: bold;
    color: #f44336;
}
```

---

## Testing Checklist

### Metadata Handling
- [ ] `_CHANGES_LOG` column NOT visible in table headers
- [ ] `_ROW_DELETE` column NOT visible in table headers
- [ ] Cell colors match actions from `_CHANGES_LOG`
- [ ] Deleted rows show RED highlighting

### Row Deletion
- [ ] Rows with `_ROW_DELETE` show red background
- [ ] Strikethrough text on deleted rows
- [ ] "🗑️ DUPLICATE" badge visible
- [ ] Edit button disabled on deleted rows
- [ ] Warning banner shows correct deletion count

### Export
- [ ] Click "Download" triggers file download
- [ ] Downloaded file name is `original_CLEANED.xlsx`
- [ ] Deleted rows are GONE (not hidden, actually deleted)
- [ ] `_CHANGES_LOG` column removed
- [ ] `_ROW_DELETE` column removed
- [ ] Data integrity preserved (correct row count)

### Example Test Case
```
Original file: 100 rows, 5 duplicates of "SN001"
Phase 3: Fix duplicates → Keep 1, mark 4 for deletion
Phase 4:
  - Shows 4 RED rows with badges
  - Warning: "4 rows will be deleted"
  - Download produces 96-row file
  - No metadata columns in downloaded file
```

---

## Known Issues & Solutions

### Issue: Deleted rows not showing in red
**Solution:** Verify `markedForDeletion` flag is being read from API response and `row-delete` class is applied.

### Issue: Metadata columns visible in table
**Solution:** Check Phase 4 routes.js GET endpoint - ensure columns are filtered before building headers array.

### Issue: Downloaded file still has metadata
**Solution:** Verify export endpoint calls `worksheet.spliceColumns()` for both metadata columns BEFORE saving.

### Issue: Wrong rows deleted
**Solution:** Ensure rows are deleted from BOTTOM to TOP (descending order sort) to preserve indices.

---

## Future Enhancements

- [ ] CSV export option
- [ ] JSON export option
- [ ] Before/after comparison view
- [ ] Undo last deletion
- [ ] Email export option
- [ ] Direct ServiceNow API upload
- [ ] Quality improvement report (PDF)

---

**Last Updated**: November 24, 2025  
**Phase Owner**: Fed @ Fujitsu Australia
