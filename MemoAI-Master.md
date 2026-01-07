# EXCEL DATA QUALITY ANALYZER - MASTER MEMO

**Project:** ServiceNow-Ready Excel Data Quality Analyzer  
**Architecture:** Multi-Phase Web Application  
**Backend:** Node.js + Express (Modular Structure)  
**Frontend:** Vanilla JavaScript + ServiceNow-Style UI  
**Maintained By:** Fed @ Fujitsu Australia  
**Last Updated:** January 5, 2026

---

## 🎯 Project Purpose

Clean and normalize Excel data for ServiceNow CMDB import by:
1. Profiling data quality
2. Detecting issues automatically
3. Providing intelligent fixes
4. Ensuring ServiceNow compatibility

---

## 📁 Project Structure

```
project-root/
├── server.js                           # Main server
├── package.json
├── .env                                # ANTHROPIC_API_KEY
│
├── MemoAI-Master.md                    # ← This file (project overview)
├── MemoAI.md                           # AI behavior documentation
│
├── uploads/                            # Uploaded Excel files (persistent!)
├── shared/                             # Shared frontend assets
│   ├── css/
│   │   └── servicenow-style.css       # ServiceNow-themed UI
│   └── js/
│       ├── app.js                      # Shared utilities
│       ├── phase1.js, phase2.js, phase3.js, phase4.js
│       └── phase3-column.js           # Column detail page
│
├── phase-1-upload-profiling/
├── phase-2-analysis/
├── phase-3-ai-remediation/
│   └── api/
│       ├── fixes.js                    # Apply fixes - CRITICAL!
│       └── actions-operations.js       # Duplicate handling, logging
│
└── phase-4-export/
    └── api/
        └── routes.js                   # Export & parsing
```

---

## 📋 `_CHANGES_LOG` - Change Tracking System

### ⚠️ CRITICAL: Consistent Format Across All Files

**Standard Format:**
```
ColumnName:action1|action2,OtherColumn:action1
```

| Separator | Purpose |
|-----------|---------|
| **Comma `,`** | Separates different columns |
| **Pipe `\|`** | Separates multiple actions on same column |

### Files That Write `_CHANGES_LOG`:
1. `phase-3-ai-remediation/api/fixes.js` - Main fix operations
2. `phase-3-ai-remediation/api/actions-operations.js` - Duplicate modal actions

### Files That Read `_CHANGES_LOG`:
1. `phase-4-export/api/routes.js` - Parses for display and export

**All files MUST use the same format!**

### Example Flow
```
Row 5: Fix whitespace on SerialNumber
  → _CHANGES_LOG: "SerialNumber:whitespace"

Row 5: Fix capitalization on SerialNumber  
  → _CHANGES_LOG: "SerialNumber:whitespace|capitalization"

Row 5: Fix empty on Hostname
  → _CHANGES_LOG: "SerialNumber:whitespace|capitalization,Hostname:empty"

Row 5: Mark as duplicate
  → _CHANGES_LOG: "SerialNumber:whitespace|capitalization|duplicates,Hostname:empty"
  → _ROW_DELETE: "DUPLICATE"
```

### Action Types Tracked
| Action | Description |
|--------|-------------|
| `whitespace` | Removed extra spaces |
| `capitalization` | Fixed title case |
| `special-chars` | Removed special characters |
| `empty` | Filled empty values |
| `duplicates` | Row marked for deletion as duplicate |
| `ai-validation` | AI-suggested fix applied |
| `manual-edit` | User manually edited cell |
| `cleared` | User cleared cell value |
| `kept` | Value unchanged |

### Key Function Pattern
```javascript
// Used in BOTH fixes.js AND actions-operations.js
function updateChangesLog(worksheet, rowNumber, columnName, action) {
    // Parse existing: "Col1:act1|act2,Col2:act1"
    const changesMap = {};
    existingChanges.split(',').forEach(entry => {  // ← COMMA split for columns
        const [col, actions] = entry.split(':');
        changesMap[col] = actions;
    });
    
    // Append action with PIPE separator
    if (changesMap[columnName]) {
        const existingActions = changesMap[columnName].split('|');
        if (!existingActions.includes(action)) {
            changesMap[columnName] = changesMap[columnName] + '|' + action;
        }
    } else {
        changesMap[columnName] = action;
    }
    
    // Convert back: join with COMMA
    const newChangesStr = Object.entries(changesMap)
        .map(([col, actions]) => `${col}:${actions}`)
        .join(',');
}
```

### Phase 4 Parsing
```javascript
// In phase-4-export/api/routes.js
changesStr.split(',').forEach(entry => {  // ← Split by COMMA first
    const colonIdx = entry.indexOf(':');
    const col = entry.substring(0, colonIdx);
    const actions = entry.substring(colonIdx + 1);
    
    // Check for deletion markers
    const actionList = actions.split('|');  // ← Then split by PIPE
    if (actionList.includes('duplicates') || actionList.includes('deleted')) {
        rowData.markedForDeletion = true;
    }
});
```

---

## 🗑️ `_ROW_DELETE` - Row Deletion Marking

### Purpose
Mark duplicate rows for deletion during Phase 3. Rows are NOT deleted immediately - they're marked and highlighted red in Phase 4, then physically deleted on export.

### Workflow
```
Phase 3: Fix Duplicates (via modal or apply-fixes)
  ├─ Keep first occurrence
  ├─ Mark others with _ROW_DELETE = "DUPLICATE"
  └─ Log in _CHANGES_LOG: "SerialNumber:duplicates"

Phase 4: Review
  ├─ Detect deletion via _ROW_DELETE column OR _CHANGES_LOG containing "duplicates"
  ├─ Show deleted rows in RED
  └─ Edit button disabled for marked rows

Phase 4: Export
  ├─ Delete rows from BOTTOM to TOP (preserves indices)
  ├─ Remove _ROW_DELETE column
  └─ Remove _CHANGES_LOG column
```

---

## 🔄 Application Flow

```
PHASE 1 (Upload)
    ↓
Parse Excel, add _CHANGES_LOG column
    ↓
PHASE 2 (Configuration)
    ↓
User marks unique qualifiers, reference data
    ↓
PHASE 3 (Remediation)
    ↓
For each fix:
  - fixes.js OR actions-operations.js writes to _CHANGES_LOG
  - Format: "Column:action1|action2,Column2:action1"
  - For duplicates: also set _ROW_DELETE = "DUPLICATE"
    ↓
PHASE 4 (Export)
    ↓
Parse _CHANGES_LOG (split by comma, then pipe)
Detect deletions from _ROW_DELETE OR _CHANGES_LOG
    ↓
Export:
  - Delete marked rows (bottom to top)
  - Remove metadata columns
  - Save clean file
```

---

## 🔑 Key Concepts

### Row Numbering Convention
```
Excel Row 1 = Header
Excel Row 2 = First data row = Array index 0
Formula: excelRow = arrayIndex + 2
```

### Quality Score
```javascript
qualityScore = ((totalCells - emptyCells) / totalCells) * 100
```

---

## 🐛 Known Issues

### Phase 3 Fixes Bug
**Issue:** Some fix actions (whitespace, capitalization, special-chars) apply to ALL rows instead of only selected rows.

**Working Correctly:** duplicates, empty

**Workaround:** Use "Fix All" button

---

## 📅 Project Timeline

- **November 2025**: Core implementation (Phases 1-4)
- **January 5, 2026**:
  - Multi-action tracking per row (pipe-separated)
  - Fixed inconsistent `_CHANGES_LOG` format across files
  - Fixed Phase 4 parsing (comma separator for columns)
  - Unified deletion detection (`duplicates`, `deleted`, `DELETE_ROW`)

---

## 🚀 Quick Start

```bash
npm install
npm start
# Access http://localhost:3000
```

---

**End of MemoAI-Master.md**
