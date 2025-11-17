# Excel Analyzer - Project Root MemoAI

## Project Overview
Multi-phase Excel data quality analyzer with ServiceNow-inspired UI. The application helps users upload Excel files, analyze data quality, apply AI-powered remediation, and export cleaned data.

## Project Structure
```
MCP_FUJ_DQ/
├── MemoAI.md               # This file - project documentation
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
│   │   └── phase3-column.css         # Phase 3 column detail styles (NEW: Nov 16)
│   └── js/
│       ├── app.js                    # Common utilities
│       ├── phase-router.js           # Phase navigation logic
│       ├── phase1.js                 # Phase 1 frontend logic
│       ├── phase2.js                 # Phase 2 frontend logic (with auto-save)
│       ├── phase3.js                 # Phase 3 landing page logic
│       └── phase3-column.js          # Phase 3 column detail controller (NEW: Nov 16)
├── phase-1-upload-profiling/
│   └── MemoAI-phase1.md    # Phase 1 detailed documentation
├── phase-2-analysis/
│   └── MemoAI-phase2.md    # Phase 2 detailed documentation
├── phase-3-ai-remediation/
│   └── MemoAI-phase3.md    # Phase 3 detailed documentation
└── phase-4-export/
    └── MemoAI-phase4.md    # Phase 4 placeholder (empty)
```

## Technology Stack
- **Backend**: Node.js with Express (ES Modules)
- **File Upload**: Multer
- **Excel Processing**: ExcelJS (ACTIVE)
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: Custom ServiceNow-inspired CSS
- **MCP Server**: For Claude Desktop filesystem access

## How It Works
1. **Single HTML File**: `index.html` serves as shell for all phases
2. **Dynamic Content Loading**: Phase router fetches content from `/api/phase{N}/content`
3. **Server-Side Architecture**: Files uploaded to server, data persists in memory between phases
4. **Auto-Save Configuration**: Phase transitions automatically save user modifications
5. **Phase Navigation**: Arrow-style navigation in header + explicit "Continue" buttons

## Quick Start Commands

### First Time Setup
```bash
# Navigate to project
cd /Users/federicomantegazza/Development/MCP_FUJ_DQ

# Install dependencies
npm install

# Create uploads directory if needed
mkdir -p uploads

# Build MCP server (for Claude Desktop access)
npm run build
```

### Running the Application
```bash
# Start the web server
./start.sh
# OR
node server.js

# Access in browser
open http://localhost:3000/phase1
```

### MCP Server (Claude Desktop Integration)
```bash
# Build MCP server when source changes
npm run build

# MCP Configuration (already in Claude Desktop config):
# {
#   "mcpServers": {
#     "FUJDQ": {
#       "command": "node",
#       "args": [
#         "/Users/federicomantegazza/Development/MCP_FUJ_DQ/dist/index.js",
#         "/Users/federicomantegazza/Development/MCP_FUJ_DQ"
#       ]
#     }
#   }
# }

# Restart Claude Desktop after building MCP server
```

## Current Implementation Status

### ✅ Phase 1: Upload & Profiling (COMPLETE)
**Documentation**: See `phase-1-upload-profiling/MemoAI-phase1.md`
- ✅ File upload with drag & drop
- ✅ File validation (.xlsx, .xls)
- ✅ Progress indicator
- ✅ Real Excel parsing with ExcelJS
- ✅ Column profiling (type detection, empty records, duplicates, unique values)
- ✅ Data quality score calculation
- ✅ Data persistence for Phase 2
- ✅ **Process steps displayed VERTICALLY** in right sidebar

### ✅ Phase 2: Analysis & Configuration (COMPLETE)
**Documentation**: See `phase-2-analysis/MemoAI-phase2.md`
- ✅ Quality score widget (displays real data)
- ✅ Column cards grid
- ✅ Type selection dropdowns (string/number/date/alphanumeric/boolean)
- ✅ Statistics display (total, empty, duplicates, unique values)
- ✅ Unique qualifier checkbox
- ✅ Reference data checkbox
- ✅ Remove column functionality (✕ button)
- ✅ Save configuration (optional - for named templates)
- ✅ **Auto-save on "Continue to Phase 3"** - Automatically saves all modifications
- ✅ Real data from Phase 1 upload

**Key Feature - Auto-Save:**
When user clicks "Continue to Phase 3 →":
1. Captures ALL column modifications (removals, type changes, checkbox states)
2. Sends to server via POST `/api/phase2/auto-save-for-phase3`
3. Server stores in `phase3Configuration` variable
4. Navigates to Phase 3
5. Phase 3 receives modified configuration automatically

### ✅ Phase 3: AI Remediation (COMPLETE - UI FRAMEWORK)
**Documentation**: See `phase-3-ai-remediation/MemoAI-phase3.md`

**Completed (November 16, 2025):**
- ✅ Explanation/Landing page showing how Phase 3 works
- ✅ Loads configuration from Phase 2 (with user modifications)
- ✅ Persistent quality score widget across phases
- ✅ Visual column list preview with types and issues
- ✅ "Begin Remediation" button
- ✅ Configuration endpoint: GET `/api/phase3/configuration`
- ✅ **Process steps displayed HORIZONTALLY** in 4-column grid
- ✅ **Three-Panel Column Detail View** (20% | 50% | 30%)
  - Left Panel: Column navigation with status indicators
  - Middle Panel: Column details, statistics, data preview, AI proposals
  - Right Panel: Token usage tracker with history
- ✅ Route: GET `/phase3/column/:columnName` 
- ✅ Auto-advance workflow (apply → success animation → next column)
- ✅ Completion screen when all columns processed
- ✅ Mock AI proposals (ready for Claude API integration)
- ✅ Success animations and transitions
- ✅ Responsive three-panel layout with scrolling

**Architecture:**
- **Landing Page** (`/phase3`): Explains process, shows column list, "Begin Remediation" button
- **Column Detail** (`/phase3/column/:columnName`): Three-panel interface for remediation
- **Navigation**: Auto-advances through columns after applying changes
- **Completion**: Shows final screen with stats when all columns complete

**Mock Data in Place:**
- Sample proposals with confidence scores
- Token usage tracking
- Statistics for affected/improved records
- Ready to replace with real Claude API calls

**TODO (Backend Integration):**
- ⏳ Connect to actual Claude API for real proposals
- ⏳ Implement real data persistence (currently mock)
- ⏳ Calculate real quality score updates
- ⏳ Save applied changes to server
- ⏳ Export functionality to Phase 4

### 🚧 Phase 4: Export (PLACEHOLDER)
**Documentation**: `phase-4-export/MemoAI-phase4.md` (empty)
- ✅ Placeholder UI with persistent quality widget
- **TODO**: Export to Excel functionality
- **TODO**: Export to CSV functionality
- **TODO**: Before/after comparison
- **TODO**: Download cleaned data

## Data Flow Between Phases

```
PHASE 1 (Upload)
    ↓
Server parses Excel with ExcelJS
Stores in: uploadedData = { fileName, fileSize, totalRecords, columns[], dataQualityScore }
    ↓
PHASE 2 (Configuration)
    ↓
GET /api/phase2/columns → Returns uploadedData
User modifies: removes columns, changes types, sets checkboxes
    ↓
Click "Continue to Phase 3 →" (auto-save)
    ↓
POST /api/phase2/auto-save-for-phase3
Stores in: phase3Configuration = { columns[], totalRecords, fileName, dataQualityScore }
    ↓
PHASE 3 (Remediation)
    ↓
GET /api/phase3/configuration → Returns phase3Configuration (with modifications!)
Landing page shows column list → Click "Begin Remediation"
    ↓
Navigate to /phase3/column/[FirstColumnName]
Three-panel interface loads:
  - Left: All columns with completion status
  - Middle: Current column details + mock AI proposals
  - Right: Token usage tracker
    ↓
User reviews proposals → Click "Apply Changes"
Success animation plays → Auto-advances to next column
Repeat for all columns
    ↓
Completion screen shows improvement stats
Click "Continue to Phase 4 →"
    ↓
PHASE 4 (Export)
    ↓
Export cleaned data with improved quality score
```

## Key Features

### Three-Panel Column Detail View (NEW: November 16, 2025)
Located at `/phase3/column/:columnName`:

**Left Panel (20% width):**
- Scrollable list of all columns
- Active column highlighted in green
- Completed columns marked with ✓
- Click any column to jump to it
- Shows column type badges

**Middle Panel (50% width):**
- Column header with name and type badge
- Statistics grid (3 columns): Total Records, Empty Records, Duplicates
- Data Preview section with sample values table
- AI Proposals section with mock remediation suggestions
- Each proposal shows:
  - Title and description
  - Confidence level badge
  - Statistics (records affected, expected improvement)
- Action buttons: "Skip Column" and "Apply Changes"

**Right Panel (30% width):**
- Real-time token usage tracking
- Three summary cards:
  - Session Total (tokens used this session)
  - Current Column (tokens for this column)
  - Remaining Budget (tokens left)
- Progress bar showing budget usage
- Token History list showing per-column usage
- Scrollable history with column names and token counts

**Workflow:**
1. Click "Begin Remediation" on landing page
2. Loads first column in three-panel view
3. Review proposals in middle panel
4. Click "Apply Changes"
5. Success animation plays (1 second)
6. Automatically advances to next column
7. Repeat until all columns complete
8. Completion screen appears with improvement stats
9. "Continue to Phase 4 →" button

### Persistent Quality Score Widget
Visible across Phase 2, Phase 3, and Phase 4:
- Shows current data quality percentage
- Displays total records and columns
- Shows file name
- Updates with progress (Phase 3)
- Shows improvement (Phase 4)

### Auto-Save Configuration
User does NOT need to manually save configuration:
- "Save Configuration" button is OPTIONAL (for named templates only)
- "Continue to Phase 3" automatically saves all work
- Removed columns stay removed
- Type changes are preserved
- Checkbox selections are maintained

### Process Steps Layout
**Two different layouts for different phases:**

#### Vertical Layout (Phase 1)
- **CSS Class**: `.process-steps-vertical`
- **Layout**: Flexbox column (top to bottom)
- **Styling**: 
  - Steps stack vertically
  - Circle and text aligned horizontally (side-by-side)
  - Left-aligned text
  - Used in Phase 1 right sidebar
- **Reason**: Better fits narrow sidebar layout

#### Horizontal Layout (Phase 3)
- **CSS Class**: `.process-steps-horizontal`
- **Layout**: CSS Grid with 4 columns
- **Styling**:
  - Steps flow left to right
  - Circle above text
  - Centered alignment
  - Used in Phase 3 explanation panel
- **Reason**: Better for full-width display

**Implementation:**
- `server.js`: Phase 1 uses `<div class="process-steps-vertical">`, Phase 3 uses `<div class="process-steps-horizontal">`
- `servicenow-style.css`: Separate CSS classes for each layout with shared `.step-number` and `.step-content` styling

## Key Dependencies
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "multer": "^1.4.5-lts.1",
  "exceljs": "^4.4.0",
  "@modelcontextprotocol/sdk": "^0.5.0"
}
```

## Development Workflow

### Making Changes
1. Edit source files in appropriate directories
2. Restart server: `./start.sh`
3. Refresh browser

### Adding New Phase Content
1. Update `server.js` - Add HTML in `/api/phase{N}/content` endpoint
2. Create/update `shared/js/phase{N}.js` - Add frontend logic
3. Update `shared/css/servicenow-style.css` - Add styles if needed
4. Update phase `MemoAI-phase{N}.md` documentation

### Working with MCP Server
1. Edit `src/index.js` for new MCP tools
2. Run `npm run build` to compile
3. Restart Claude Desktop to reload

## Important Notes

### Why ES Modules?
- MCP server requires ES modules (`"type": "module"` in package.json)
- All `require()` changed to `import`
- All CommonJS syntax converted to ES6

### Why Multer?
- Handles `multipart/form-data` from file uploads
- Browser sends files in this format
- Express can't handle it natively

### File & Data Persistence Strategy
- Phase 1 uploads go to `/uploads` folder (temporary)
- Parsed data stored in server memory: `uploadedData`
- Phase 2 configuration stored in: `phase3Configuration`
- **Note**: Data lost on server restart (acceptable for MVP)
- **Future**: Can upgrade to database storage (Redis/MongoDB)

### "Save Configuration" vs Auto-Save
- **"Save Configuration" button**: Optional, creates named template for reuse
- **"Continue to Phase 3" button**: Always auto-saves current work
- User can skip saving and still proceed safely

### MIME Type Handling (November 16, 2025)
**Issue:** CSS files were returning HTML 404 pages instead of stylesheet content.

**Solution:** Added middleware to explicitly set MIME types:
```javascript
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.path.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});
```

This must come BEFORE `express.static()` middleware to work properly.

## Common Issues & Solutions

### MCP Server Not Working
```bash
# Rebuild the MCP server
npm run build

# Check dist/index.js exists
ls -la dist/

# Restart Claude Desktop
```

### Server Won't Start
```bash
# Check for port conflicts
lsof -i :3000

# Check Node version
node --version  # Should be v18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Phase Content Not Loading
- Check browser console for errors
- Verify server is running on port 3000
- Check `/api/phase{N}/content` endpoint in server.js
- Verify phase router is loaded in index.html

### CSS Not Loading (Phase 3 Column Detail)
**Symptom:** Page loads but no styling, browser console shows MIME type error

**Solution:**
1. Verify `phase3-column.css` exists in `shared/css/`
2. Check middleware order in `server.js` - MIME type middleware must come before `express.static()`
3. Verify CSS file has correct `text/css` MIME type
4. Clear browser cache and hard refresh (Cmd+Shift+R)

### Configuration Not Passing to Phase 3
- Check browser console for "Auto-saving configuration" message
- Verify POST to `/api/phase2/auto-save-for-phase3` succeeds
- Check server console for "Configuration auto-saved" message
- Try refreshing and starting from Phase 1

## Testing Guide

See `TESTING_GUIDE.md` for complete step-by-step testing instructions.

**Quick Test Flow:**
1. Start server: `node server.js`
2. Visit: `http://localhost:3000/phase1`
3. Upload Excel file
4. Navigate to Phase 2
5. Remove a column, change a type
6. Click "Continue to Phase 3" (without saving)
7. Verify Phase 3 landing page loads with your modifications
8. Click "Begin Remediation"
9. Verify three-panel view loads with left/middle/right panels
10. Click "Apply Changes"
11. Watch success animation and auto-advance to next column
12. Complete all columns and see completion screen

## Next Steps

### Immediate (Phase 3 Backend Integration)
1. ✅ Three-panel UI framework (DONE - Nov 16)
2. ⏳ Connect to Claude API for real proposals
3. ⏳ Load actual column data from Phase 2
4. ⏳ Implement real data persistence
5. ⏳ Calculate actual quality score improvements
6. ⏳ Save changes back to server

### Short Term (Phase 4)
1. Export cleaned data to Excel
2. Export to CSV option
3. Before/after comparison view
4. Download functionality

### Long Term (Enhancements)
1. Database persistence (replace memory storage)
2. Named configuration templates with save/load
3. Real AI-powered suggestions via Claude API
4. Batch processing multiple files
5. Custom remediation rules

## API Endpoints

### Phase 1
- `GET /api/phase1/content` - Returns Phase 1 HTML
- `POST /api/phase1/upload` - Handles file upload, returns parsed data

### Phase 2
- `GET /api/phase2/content` - Returns Phase 2 HTML
- `GET /api/phase2/columns` - Returns uploaded data from Phase 1
- `POST /api/phase2/auto-save-for-phase3` - Auto-saves configuration for Phase 3

### Phase 3
- `GET /api/phase3/content` - Returns Phase 3 HTML (landing/explanation page)
- `GET /api/phase3/configuration` - Returns saved configuration from Phase 2
- `GET /phase3/column/:columnName` - Returns three-panel column detail view (NEW: Nov 16)

### Phase 4
- `GET /api/phase4/content` - Returns Phase 4 HTML (placeholder)

## File Inventory

### Shared Resources
**CSS Files:**
- `shared/css/servicenow-style.css` - Main application styles (all phases)
- `shared/css/phase3-column.css` - Phase 3 column detail styles (NEW: Nov 16, 2025)

**JavaScript Files:**
- `shared/js/app.js` - Common utilities
- `shared/js/phase-router.js` - Phase navigation
- `shared/js/phase1.js` - Phase 1 upload logic
- `shared/js/phase2.js` - Phase 2 configuration logic
- `shared/js/phase3.js` - Phase 3 landing page logic
- `shared/js/phase3-column.js` - Phase 3 column detail controller (NEW: Nov 16, 2025)

### Documentation Files
- `MemoAI.md` - This file (project overview)
- `TESTING_GUIDE.md` - Testing instructions
- `phase-1-upload-profiling/MemoAI-phase1.md` - Phase 1 detailed docs
- `phase-2-analysis/MemoAI-phase2.md` - Phase 2 detailed docs
- `phase-3-ai-remediation/MemoAI-phase3.md` - Phase 3 detailed docs
- `phase-4-export/MemoAI-phase4.md` - Phase 4 placeholder

## Maintenance

### Updating Dependencies
```bash
npm update
npm audit fix
```

### Backup Important Files
- `server.js` - Main application logic
- `shared/` - All shared resources
- `src/index.js` - MCP server source
- `MemoAI.md` - This documentation

## Project Timeline

- **November 12, 2025**: Phase 1 & 2 core implementation
- **November 14, 2025**: Phase 2→3 auto-save, Phase 3 explanation page, persistent quality widget, process steps layout fix (vertical/horizontal)
- **November 16, 2025**: Phase 3 three-panel column detail view, auto-advance workflow, completion screen, CSS MIME type fix
- **Next**: Phase 3 Claude API integration, real data persistence

## Contact & Support
- Project Owner: Fed (Fujitsu Solution Architect)
- Project: FUJDQ - Excel Data Quality Analyzer
- Last Updated: November 16, 2025
