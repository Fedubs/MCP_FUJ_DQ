# Excel Analyzer - Project Root MemoAI

## Project Overview
Multi-phase Excel data quality analyzer with ServiceNow-inspired UI. The application helps users upload Excel files, analyze data quality, apply AI-powered remediation, and export cleaned data.

## Project Structure
```
MCP_FUJ_DQ/
├── MemoAI.md               # This file - project documentation
├── MemoAI-Master.md        # Master documentation with architecture details
├── TESTING_GUIDE.md        # Quick start testing guide
├── index.html              # Main HTML shell (loads phase content dynamically)
├── server.js               # Express server (ES modules)
├── package.json            # Dependencies (express, cors, multer, exceljs)
├── start.sh                # Server startup script
├── uploads/                # Uploaded file storage
├── src/                    # MCP Server source code
│   └── index.js            # MCP filesystem tools server
├── dist/                   # MCP Server compiled code
│   └── index.js            # Built MCP server (used by Claude Desktop)
├── shared/                 # Shared resources across all phases
│   ├── css/
│   │   ├── servicenow-style.css      # Main application styles
│   │   ├── phase3-column.css         # Phase 3 column detail styles
│   │   ├── duplicate-modal.css       # Duplicate comparison modal styles
│   │   └── reference-modal.css       # ServiceNow reference modal styles
│   └── js/
│       ├── app.js                    # Common utilities
│       ├── phase-router.js           # Phase navigation logic
│       ├── phase1.js                 # Phase 1 frontend logic
│       ├── phase2.js                 # Phase 2 frontend logic (with auto-save)
│       ├── phase3.js                 # Phase 3 landing page logic
│       ├── phase3-column.js          # Phase 3 column detail controller
│       ├── phase4.js                 # Phase 4 export logic
│       ├── duplicate-modal.js        # Duplicate comparison modal component
│       └── reference-modal.js        # ServiceNow reference modal component
├── phase-1-upload-profiling/
│   └── MemoAI-phase1.md    # Phase 1 detailed documentation
├── phase-2-analysis/
│   └── MemoAI-phase2.md    # Phase 2 detailed documentation
├── phase-3-ai-remediation/
│   ├── MemoAI-phase3.md    # Phase 3 detailed documentation
│   └── api/
│       ├── quality-score.js          # 🆕 Quality score calculation
│       └── capitalization-helpers.js # 🆕 Smart capitalization logic
└── phase-4-export/
    └── MemoAI-phase4.md    # Phase 4 detailed documentation
```

---

## 🆕 RECENT MAJOR UPDATES

### January 6, 2026: Quality Score System

**New Feature:** Data Quality Score now calculated based on actual issues, displayed in Phase 3.

**Where Score is Shown:**
| Phase | Display |
|-------|---------|
| Phase 1 | No quality widget |
| Phase 2 | Shows "Phase 3" (score calculated later) |
| Phase 3 | Calculated on entry, shows actual % |
| Phase 4 | Shows final score after fixes |

**Quality Score Formula:**
```
Quality Score = (Uniqueness × 30%) + 
                (Validity × 30%) + 
                (Consistency × 20%) + 
                (Accuracy × 20%)

If no reference data columns, weights redistribute:
- Uniqueness: 37.5%
- Validity: 37.5%
- Consistency: 25%
```

**Factor Definitions:**
| Factor | Weight | Calculation |
|--------|--------|-------------|
| **Uniqueness** | 30% | Duplicates in unique qualifier columns only |
| **Validity** | 30% | Data format issues based on subtype validation |
| **Consistency** | 20% | Capitalization, whitespace, special chars (string columns) |
| **Accuracy** | 20% | Reference data matches (if ServiceNow configured) |

**API Endpoints:**
- `POST /api/phase3/calculate-quality-score` - Calculate all issues upfront
- `GET /api/phase3/quality-score` - Get current quality score
- `POST /api/phase3/recalculate-column` - Recalculate after fixes

**Files Created:**
- `phase-3-ai-remediation/api/quality-score.js` - Quality score calculation logic

---

### January 6, 2026: Smart Capitalization

**New Feature:** Intelligent capitalization that respects codes, acronyms, and special patterns.

**Rules Implemented:**
| Rule | Example | Action |
|------|---------|--------|
| ServiceNow Records | `INC0012345` | Keep as-is |
| sys_id | `6816f79cc0a8016401c5a33be04be441` | Keep as-is |
| Codes/Identifiers | `a07uqq17`, `SRV-001` | Keep as-is |
| Email | `John.Smith@Company.com` | Lowercase |
| Acronyms (2-5 caps) | `IBM`, `AWS`, `CPU` | Keep as-is |
| CamelCase | `firstName`, `ServiceNow` | Keep as-is |
| Special Prefixes | `mcdonald` → `McDonald` | Smart capitalize |
| Special Prefixes | `o'brien` → `O'Brien` | Smart capitalize |
| Connector Words | `director of sales` → `Director of Sales` | Lowercase mid-string |
| First Word | `the university` → `The University` | Always capitalize |

**ServiceNow Record Patterns Detected:**
- `INC`, `REQ`, `RITM`, `CHG`, `PRB`, `TASK`, `SCTASK`, `KB`, `STRY`, `PTASK`, `PRJ`, `SECRQ`

**Files Created:**
- `phase-3-ai-remediation/api/capitalization-helpers.js` - All capitalization logic

**Files Updated:**
- `phase-3-ai-remediation/api/actions-issues.js` - Uses `smartCapitalize()` for suggestions
- `phase-3-ai-remediation/api/fixes.js` - Uses `smartCapitalize()` when applying fixes

---

### January 5, 2026: Consistent _CHANGES_LOG Format Across All Files

**Problem Fixed:** Two different files (`fixes.js` and `actions-operations.js`) were using incompatible formats for `_CHANGES_LOG`. Phase 4 was parsing incorrectly.

**Standard Format (Now Consistent Everywhere):**
```
ColumnName:action1|action2,OtherColumn:action1
```
- **Comma `,`** separates different columns
- **Pipe `|`** separates multiple actions on same column

---

### November 23, 2025: Metadata Tracking System

**Critical Rule:** 
> `_CHANGES_LOG` column must be created on file upload and removed before download in Phase 4. All changes (Delete/Keep/Edit) are logged only, not applied until export.

---

## Technology Stack
- **Backend**: Node.js with Express (ES Modules)
- **File Upload**: Multer
- **Excel Processing**: ExcelJS (ACTIVE)
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: Custom ServiceNow-inspired CSS
- **MCP Server**: For Claude Desktop filesystem access

## Quick Start Commands

```bash
# Start the web server
./start.sh
# OR
node server.js

# Access in browser
open http://localhost:3000/phase1
```

## Current Implementation Status

### ✅ Phase 1: Upload & Profiling (COMPLETE)
### ✅ Phase 2: Analysis & Configuration (COMPLETE)
### ✅ Phase 3: AI Remediation (COMPLETE)
### ✅ Phase 4: Export (COMPLETE)

## Data Flow Between Phases

```
PHASE 1 (Upload)
    ↓
Server parses Excel with ExcelJS
Adds _CHANGES_LOG column (empty)
    ↓
PHASE 2 (Configuration)
    ↓
User configures columns (unique qualifiers, reference data, subtypes)
Quality Score shows "Phase 3" (not calculated yet)
    ↓
PHASE 3 (Remediation)
    ↓
On Entry: Calculate Quality Score (all issues across all columns)
For each fix:
  - Update _CHANGES_LOG: "ColumnName:action1|action2"
  - For duplicates: Mark rows with _ROW_DELETE
  - Recalculate Quality Score for column
    ↓
PHASE 4 (Export)
    ↓
Read _CHANGES_LOG → Color-code cells
Read _ROW_DELETE → Show RED rows
    ↓
Export:
  - Delete marked rows (bottom to top)
  - Remove _ROW_DELETE column
  - Remove _CHANGES_LOG column
  - Save clean file
```

## Project Timeline

- **November 12, 2025**: Phase 1 & 2 core implementation
- **November 14, 2025**: Phase 2→3 auto-save, Phase 3 landing page
- **November 16, 2025**: Phase 3 three-panel view, auto-advance workflow
- **November 21, 2025**: Duplicate comparison modal
- **November 23, 2025**: `_CHANGES_LOG` metadata tracking, `_ROW_DELETE` duplicate row deletion
- **January 5, 2026**: Multi-action tracking, consistent _CHANGES_LOG format
- **January 6, 2026**: 
  - Quality Score system (calculated in Phase 3)
  - Smart Capitalization (code detection, acronyms, ServiceNow records)

## Contact & Support
- Project Owner: Fed (Fujitsu Solution Architect)
- Project: FUJDQ - Excel Data Quality Analyzer
- Last Updated: January 6, 2026
