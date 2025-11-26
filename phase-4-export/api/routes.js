// Phase 4: Export API Routes - WITH ROW DELETION SUPPORT
// ✅ UPDATED: Now applies EDIT changes before exporting
import express from 'express';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// GET /api/phase4/content - Phase 4 export page
router.get('/api/phase4/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">Export Clean Data</h1>
            <div class="page-subtitle">Review changes and download your cleaned Excel file</div>
        </div>

        <!-- Review Panel (Initially Visible) -->
        <div id="reviewPanel" class="review-panel">
            <!-- Fixed Validated Button (Top Right) -->
            <button id="validatedBtn" class="validated-btn" onclick="Phase4.closeReviewPanel()">
                ✓ Validated - Proceed to Download
            </button>

            <div class="panel-header">
                <h2>📋 Review All Changes Before Export</h2>
                <p class="review-subtitle">Review and edit any changes made during Phase 3 remediation</p>
            </div>

            <div class="review-summary" id="reviewSummary">
                <div class="summary-stat">
                    <span class="stat-value" id="totalChanges">0</span>
                    <span class="stat-label">Total Changes</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value" id="changedCount">0</span>
                    <span class="stat-label">Updated</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value" id="rejectedCount">0</span>
                    <span class="stat-label">Rejected</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value" id="keptCount">0</span>
                    <span class="stat-label">Kept Valid</span>
                </div>
                <div class="summary-stat" style="background: #ffebee;">
                    <span class="stat-value" id="deletedCount" style="color: #f44336;">0</span>
                    <span class="stat-label">🗑️ To Delete</span>
                </div>
            </div>

            <!-- Search/Filter -->
            <div class="review-controls">
                <input type="text" 
                       id="searchChanges" 
                       class="search-input" 
                       placeholder="🔍 Search by row, column, or value..."
                       onkeyup="Phase4.filterChanges()">
                <select id="filterAction" class="filter-select" onchange="Phase4.filterChanges()">
                    <option value="all">All Actions</option>
                    <option value="changed">Changed Only</option>
                    <option value="rejected">Rejected Only</option>
                    <option value="kept">Kept Valid Only</option>
                    <option value="deleted">🗑️ To Delete</option>
                </select>
            </div>

            <!-- Changes Table -->
            <div class="review-table-container">
                <table class="review-table" id="reviewTable">
                    <thead>
                        <tr>
                            <th>Row</th>
                            <th>Column</th>
                            <th>Original Value</th>
                            <th>New Value</th>
                            <th>Action</th>
                            <th>Edit</th>
                        </tr>
                    </thead>
                    <tbody id="reviewTableBody">
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 2rem; color: #888;">
                                Loading changes...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="review-footer">
                <p class="review-note">
                    💡 <strong>Tip:</strong> Rows highlighted in <span style="color: #f44336; font-weight: bold;">RED</span> will be permanently deleted on export.
                </p>
            </div>
        </div>

        <!-- Export Ready Section (Initially Hidden) -->
        <div id="exportSection" class="sn-panel" style="display: none;">
            <div class="panel-body" style="text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">📥</div>
                
                <h2 style="margin-bottom: 1rem;">Your Data is Ready!</h2>
                
                <p style="color: #888; font-size: 1.1rem; margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                    All data quality issues have been fixed. Click the button below to download your cleaned Excel file.
                </p>
                
                <button onclick="Phase4.exportFile()" class="sn-btn-primary" style="font-size: 1.2rem; padding: 1.5rem 3rem;">
                    📥 Download Cleaned File
                </button>
                
                <div style="margin-top: 3rem; padding: 1.5rem; background: rgba(0, 255, 65, 0.1); border: 1px solid #28a745; border-radius: 4px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <h3 style="margin: 0 0 0.5rem 0; color: #74a290ff;">✅ What's Been Fixed</h3>
                    <p style="margin: 0; color: #ccc; text-align: left;">
                        • All data quality issues resolved<br>
                        • Duplicates removed or corrected<br>
                        • Empty values filled<br>
                        • Formats standardized<br>
                        • Marked rows will be deleted<br>
                        • Ready for ServiceNow import
                    </p>
                </div>

                <button onclick="Phase4.showReviewPanel()" 
                        class="btn btn-secondary" 
                        style="margin-top: 2rem;">
                    ← Back to Review Changes
                </button>
            </div>
        </div>
        
        <script src="/shared/js/app.js"></script>
        <script src="/shared/js/phase4.js"></script>
    `);
});

// GET /api/phase4/get-changes - Read from Excel file directly
router.get('/api/phase4/get-changes', async (req, res) => {
    try {
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        if (!uploadedFilePath) {
            return res.json({ 
                success: true, 
                allData: [],
                headers: [],
                trackedDecisions: [],
                deletionCount: 0
            });
        }
        
        console.log('📖 Phase 4: Reading Excel file:', uploadedFilePath);
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        // Find metadata columns
        const headers = [];
        let changesLogIndex = -1;
        let rowDeleteIndex = -1;
        
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const colName = cell.value?.toString() || `Column ${colNumber}`;
            
            if (colName === '_CHANGES_LOG') {
                changesLogIndex = colNumber;
                console.log(`📋 Found _CHANGES_LOG at column ${colNumber}`);
            } else if (colName === '_ROW_DELETE') {
                rowDeleteIndex = colNumber;
                console.log(`🗑️ Found _ROW_DELETE at column ${colNumber}`);
            } else {
                headers.push({ index: colNumber, name: colName });
            }
        });
        
        // Build data
        const allData = [];
        const trackedChanges = [];
        let deletionCount = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            const rowData = {
                rowNumber: rowNumber,
                cells: {},
                markedForDeletion: false,
                deletionReason: null,
                changesLogRaw: ''
            };
            
            // Check deletion status from _ROW_DELETE column
            if (rowDeleteIndex > 0) {
                const deleteValue = row.getCell(rowDeleteIndex).value?.toString() || '';
                if (deleteValue) {
                    rowData.markedForDeletion = true;
                    rowData.deletionReason = deleteValue;
                    deletionCount++;
                    console.log(`🗑️ Row ${rowNumber} marked for deletion: ${deleteValue}`);
                }
            }
            
            // Parse changes log (format: "Column1:ACTION|Column2:ACTION")
            let changesMap = {};
            if (changesLogIndex > 0) {
                const changesStr = row.getCell(changesLogIndex).value?.toString() || '';
                rowData.changesLogRaw = changesStr;
                
                if (changesStr) {
                    console.log(`📋 Row ${rowNumber} _CHANGES_LOG: "${changesStr}"`);
                    
                    changesStr.split('|').forEach(entry => {
                        const colonIdx = entry.indexOf(':');
                        if (colonIdx > 0) {
                            const col = entry.substring(0, colonIdx).trim();
                            const act = entry.substring(colonIdx + 1).trim();
                            changesMap[col] = act;
                            console.log(`   → ${col}: ${act}`);
                            
                            if (act === 'DELETE_ROW') {
                                rowData.markedForDeletion = true;
                                rowData.deletionReason = 'DUPLICATE';
                                if (!deletionCount) deletionCount++;
                            }
                        }
                    });
                }
            }
            
            // Build cells
            headers.forEach(header => {
                const cell = row.getCell(header.index);
                const cellValue = cell.value?.toString() || '';
                const action = changesMap[header.name] || 'unchanged';
                
                rowData.cells[header.name] = {
                    originalValue: cellValue,
                    currentValue: cellValue,
                    action: action
                };
                
                if (action !== 'unchanged') {
                    trackedChanges.push({
                        rowNumber,
                        columnName: header.name,
                        action: action,
                        markedForDeletion: action === 'DELETE_ROW'
                    });
                }
            });
            
            if (rowData.markedForDeletion) {
                trackedChanges.push({
                    rowNumber,
                    columnName: '_ENTIRE_ROW_',
                    action: 'deleted',
                    markedForDeletion: true,
                    deletionReason: rowData.deletionReason
                });
            }
            
            allData.push(rowData);
        });
        
        console.log(`✅ Phase 4: Loaded ${allData.length} rows, ${deletionCount} marked for deletion`);
        
        res.json({ 
            success: true, 
            allData: allData,
            headers: headers.map(h => h.name),
            trackedDecisions: trackedChanges,
            deletionCount: deletionCount
        });
        
    } catch (error) {
        console.error('Error in get-changes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            allData: [],
            headers: [],
            trackedDecisions: [],
            deletionCount: 0
        });
    }
});

// POST /api/phase4/update-change
router.post('/api/phase4/update-change', async (req, res) => {
    try {
        const { rowNumber, columnName, newValue } = req.body;
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        if (!uploadedFilePath) {
            return res.status(404).json({ error: 'No file found' });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        const headerRow = worksheet.getRow(1);
        let columnIndex = -1;
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value === columnName) {
                columnIndex = colNumber;
            }
        });
        
        if (columnIndex === -1) {
            return res.status(404).json({ error: `Column "${columnName}" not found` });
        }
        
        worksheet.getRow(rowNumber).getCell(columnIndex).value = newValue || '';
        await workbook.xlsx.writeFile(uploadedFilePath);
        
        const rawData = req.app.locals.phase3Storage?.rawData || req.app.locals.rawExcelData;
        if (rawData && rawData[columnName]) {
            const arrayIndex = rowNumber - 2;
            if (arrayIndex >= 0 && arrayIndex < rawData[columnName].length) {
                rawData[columnName][arrayIndex] = newValue;
            }
        }
        
        res.json({ success: true, message: 'Change updated successfully' });
        
    } catch (error) {
        console.error('Error updating change:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase4/export - ✅ NOW APPLIES EDITS BEFORE EXPORTING
router.post('/api/phase4/export', async (req, res) => {
    try {
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        if (!uploadedFilePath) {
            return res.status(404).json({ error: 'No file to export' });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        // Build column index map for quick lookup
        const headerRow = worksheet.getRow(1);
        const columnIndexMap = {};
        let changesLogIndex = -1;
        let rowDeleteIndex = -1;
        
        headerRow.eachCell((cell, colNumber) => {
            const colName = cell.value?.toString() || '';
            if (colName === '_CHANGES_LOG') {
                changesLogIndex = colNumber;
            } else if (colName === '_ROW_DELETE') {
                rowDeleteIndex = colNumber;
            } else {
                columnIndexMap[colName] = colNumber;
            }
        });
        
        console.log('📋 Column index map:', columnIndexMap);
        console.log(`📋 _CHANGES_LOG at column ${changesLogIndex}`);
        
        // ✅ STEP 1: Apply EDIT changes from _CHANGES_LOG
        const rowsToDelete = [];
        let editsApplied = 0;
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            // Check _ROW_DELETE column
            if (rowDeleteIndex > 0) {
                const deleteValue = row.getCell(rowDeleteIndex).value?.toString() || '';
                if (deleteValue) {
                    rowsToDelete.push(rowNumber);
                }
            }
            
            // Parse _CHANGES_LOG and apply edits
            if (changesLogIndex > 0) {
                const changesStr = row.getCell(changesLogIndex).value?.toString() || '';
                
                if (changesStr) {
                    changesStr.split('|').forEach(entry => {
                        const colonIdx = entry.indexOf(':');
                        if (colonIdx > 0) {
                            const colName = entry.substring(0, colonIdx).trim();
                            const action = entry.substring(colonIdx + 1).trim();
                            
                            // Check for DELETE_ROW
                            if (action === 'DELETE_ROW') {
                                if (!rowsToDelete.includes(rowNumber)) {
                                    rowsToDelete.push(rowNumber);
                                }
                            }
                            // ✅ Check for EDIT (format: OldValue→NewValue)
                            else if (action.includes('→')) {
                                const arrowIdx = action.indexOf('→');
                                const newValue = action.substring(arrowIdx + 1).trim();
                                
                                // Find column index and apply new value
                                const targetColIndex = columnIndexMap[colName];
                                if (targetColIndex) {
                                    const currentValue = row.getCell(targetColIndex).value?.toString() || '';
                                    row.getCell(targetColIndex).value = newValue;
                                    console.log(`✎ Row ${rowNumber}, ${colName}: "${currentValue}" → "${newValue}"`);
                                    editsApplied++;
                                } else {
                                    console.log(`⚠️ Column "${colName}" not found for edit`);
                                }
                            }
                            // KEEP - no action needed, value stays the same
                        }
                    });
                }
            }
        });
        
        console.log(`✅ Applied ${editsApplied} edits`);
        console.log(`🗑️ Deleting ${rowsToDelete.length} rows: ${rowsToDelete.join(', ')}`);
        
        // ✅ STEP 2: Delete rows (bottom to top to preserve indices)
        rowsToDelete.sort((a, b) => b - a);
        rowsToDelete.forEach(rowNumber => {
            worksheet.spliceRows(rowNumber, 1);
        });
        
        // ✅ STEP 3: Remove metadata columns
        const updatedHeader = worksheet.getRow(1);
        let newChangesLogIndex = -1;
        let newRowDeleteIndex = -1;
        
        updatedHeader.eachCell((cell, colNumber) => {
            if (cell.value === '_CHANGES_LOG') {
                newChangesLogIndex = colNumber;
            } else if (cell.value === '_ROW_DELETE') {
                newRowDeleteIndex = colNumber;
            }
        });
        
        const columnsToRemove = [newChangesLogIndex, newRowDeleteIndex]
            .filter(i => i > 0)
            .sort((a, b) => b - a);
        
        columnsToRemove.forEach(colIndex => {
            worksheet.spliceColumns(colIndex, 1);
            console.log(`🗑️ Removed column at index ${colIndex}`);
        });
        
        // ✅ STEP 4: Save and send
        const fileName = path.basename(uploadedFilePath, path.extname(uploadedFilePath));
        const cleanedPath = path.join(path.dirname(uploadedFilePath), `${fileName}_CLEANED.xlsx`);
        
        await workbook.xlsx.writeFile(cleanedPath);
        
        const downloadName = `${fileName}_CLEANED.xlsx`;
        
        res.download(cleanedPath, downloadName, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to download file' });
                }
            } else {
                console.log(`✅ File downloaded: ${downloadName}`);
                try {
                    fs.unlinkSync(cleanedPath);
                } catch (cleanupError) {
                    console.error('Could not delete temp file:', cleanupError.message);
                }
            }
        });
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export file: ' + error.message });
    }
});

export default router;
