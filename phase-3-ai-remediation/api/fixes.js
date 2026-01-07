// Phase 3: Apply Fixes API Routes - WITH ROW DELETION SUPPORT
import express from 'express';
import ExcelJS from 'exceljs';
import { generateFix, autoDetectSubtype } from './data-format-validation.js';
import { smartCapitalize } from './capitalization-helpers.js';

const router = express.Router();

// ===== METADATA COLUMN HELPERS =====
// Ensure _CHANGES_LOG column exists, return its index
function ensureChangesLogColumn(worksheet) {
    const headerRow = worksheet.getRow(1);
    let changesColumnIndex = -1;
    
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === '_CHANGES_LOG') {
            changesColumnIndex = colNumber;
        }
    });
    
    if (changesColumnIndex === -1) {
        const lastCol = headerRow.actualCellCount + 1;
        headerRow.getCell(lastCol).value = '_CHANGES_LOG';
        changesColumnIndex = lastCol;
        console.log(`✓ Added _CHANGES_LOG column at index ${lastCol}`);
    }
    
    return changesColumnIndex;
}

// Update _CHANGES_LOG metadata for a specific row
function updateChangesLog(worksheet, rowNumber, columnName, action) {
    const changesColumnIndex = ensureChangesLogColumn(worksheet);
    const row = worksheet.getRow(rowNumber);
    const changesCell = row.getCell(changesColumnIndex);
    
    const existingChanges = changesCell.value ? String(changesCell.value) : '';
    const changesMap = {};
    
    if (existingChanges) {
        existingChanges.split(',').forEach(entry => {
            const [col, actions] = entry.split(':');
            if (col && actions) {
                changesMap[col.trim()] = actions.trim();
            }
        });
    }
    
    if (changesMap[columnName]) {
        const existingActions = changesMap[columnName].split('|');
        if (!existingActions.includes(action)) {
            changesMap[columnName] = changesMap[columnName] + '|' + action;
        }
    } else {
        changesMap[columnName] = action;
    }
    
    const newChangesStr = Object.entries(changesMap)
        .map(([col, actions]) => `${col}:${actions}`)
        .join(',');
    
    changesCell.value = newChangesStr;
    console.log(`✓ Updated _CHANGES_LOG for row ${rowNumber}: ${newChangesStr}`);
}

// Ensure _ROW_DELETE column exists for marking rows to be deleted
function ensureRowDeleteColumn(worksheet) {
    const headerRow = worksheet.getRow(1);
    let deleteColumnIndex = -1;
    
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === '_ROW_DELETE') {
            deleteColumnIndex = colNumber;
        }
    });
    
    if (deleteColumnIndex === -1) {
        const lastCol = headerRow.actualCellCount + 1;
        headerRow.getCell(lastCol).value = '_ROW_DELETE';
        deleteColumnIndex = lastCol;
        console.log(`✓ Added _ROW_DELETE column at index ${lastCol}`);
    }
    
    return deleteColumnIndex;
}

// Mark entire row for deletion
function markRowForDeletion(worksheet, rowNumber, reason) {
    const deleteColumnIndex = ensureRowDeleteColumn(worksheet);
    const row = worksheet.getRow(rowNumber);
    const deleteCell = row.getCell(deleteColumnIndex);
    
    deleteCell.value = reason || 'DELETE';
    console.log(`🗑️  Marked row ${rowNumber} for deletion: ${reason}`);
}

// POST /api/phase3/apply-fixes - Apply fixes to column data
router.post('/api/phase3/apply-fixes', async (req, res) => {
    try {
        const { columnName, actionType, fixes, subtype, columnType } = req.body;
        
        console.log('Applying', actionType, 'fixes to column:', columnName);
        console.log('Total fixes to apply:', fixes.length);
        if (subtype) console.log('Subtype:', subtype);
        
        // Get shared state
        const rawExcelData = req.app.locals.rawExcelData;
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        const phase3Configuration = req.app.locals.phase3Configuration;
        
        if (!rawExcelData[columnName]) {
            return res.status(404).json({
                success: false,
                error: 'Column "' + columnName + '" not found in raw data'
            });
        }
        
        let fixedCount = 0;
        let columnData = [...rawExcelData[columnName]];
        
        // Track which rows were actually fixed
        const fixedRows = new Set();
        
        // ===== APPLY FIXES BASED ON ACTION TYPE =====
        
        if (actionType === 'duplicates') {
            // Mark rows for deletion instead of removing data
            console.log('🗑️  Marking duplicate rows for deletion...');
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(uploadedFilePath);
            const worksheet = workbook.worksheets[0];
            
            fixes.forEach(fix => {
                markRowForDeletion(worksheet, fix.rowNumber, 'DUPLICATE');
                updateChangesLog(worksheet, fix.rowNumber, columnName, 'duplicates');
                fixedRows.add(fix.rowNumber);
                fixedCount++;
            });
            
            await workbook.xlsx.writeFile(uploadedFilePath);
            console.log(`🗑️  Marked ${fixedCount} duplicate rows for deletion`);
            
        } else if (actionType === 'data-format-validation') {
            // ✅ UNIFIED: Data Format Validation fixes
            console.log(`📋 Applying data format validation fixes...`);
            
            // Determine effective subtype
            const effectiveSubtype = subtype || autoDetectSubtype(columnName, columnType);
            
            fixes.forEach(fix => {
                const rowIndex = fix.rowNumber - 2;
                if (rowIndex >= 0 && rowIndex < columnData.length) {
                    // Only apply if suggested fix is not MANUAL_CHECK_REQUIRED
                    if (fix.suggestedFix && fix.suggestedFix !== 'MANUAL_CHECK_REQUIRED') {
                        columnData[rowIndex] = fix.suggestedFix;
                        fixedRows.add(fix.rowNumber);
                        fixedCount++;
                    }
                }
            });
            
            console.log(`📋 Applied ${fixedCount} data format validation fixes`);
            
        } else if (actionType === 'empty') {
            fixes.forEach(fix => {
                const rowIndex = fix.rowNumber - 2;
                if (rowIndex >= 0 && rowIndex < columnData.length) {
                    columnData[rowIndex] = fix.suggestedFix;
                    fixedRows.add(fix.rowNumber);
                    fixedCount++;
                }
            });
            
        } else if (actionType === 'whitespace') {
            columnData = columnData.map((value, index) => {
                if (typeof value === 'string' && value) {
                    const trimmed = value.replace(/\s+/g, ' ').trim();
                    if (trimmed !== value) {
                        fixedRows.add(index + 2);
                        fixedCount++;
                    }
                    return trimmed;
                }
                return value;
            });
            
        } else if (actionType === 'capitalization') {
            // ✅ SMART CAPITALIZATION - Using helper functions
            console.log('🔤 Applying Smart Capitalization fixes...');
            
            columnData = columnData.map((value, index) => {
                if (typeof value === 'string' && value) {
                    const result = smartCapitalize(value);
                    
                    // Only apply if there's a change and it shouldn't be skipped
                    if (!result.shouldSkip && result.suggestedFix !== value) {
                        fixedRows.add(index + 2);
                        fixedCount++;
                        return result.suggestedFix;
                    }
                }
                return value;
            });
            
            console.log(`🔤 Applied ${fixedCount} capitalization fixes`);
            
        } else if (actionType === 'special-chars') {
            columnData = columnData.map((value, index) => {
                if (typeof value === 'string' && value) {
                    const original = value;
                    const cleaned = value.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
                    if (cleaned !== original) {
                        fixedRows.add(index + 2);
                        fixedCount++;
                    }
                    return cleaned;
                }
                return value;
            });
            
        } else if (actionType === 'currency') {
            columnData = columnData.map((value, index) => {
                if (typeof value === 'string' && /[$€£¥₹]/.test(value)) {
                    const cleaned = value.replace(/[$€£¥₹]/g, '').trim();
                    fixedRows.add(index + 2);
                    fixedCount++;
                    return cleaned;
                }
                return value;
            });
            
        } else if (actionType === 'commas') {
            columnData = columnData.map((value, index) => {
                if (typeof value === 'string' && value.includes(',')) {
                    const cleaned = value.replace(/,/g, '');
                    fixedRows.add(index + 2);
                    fixedCount++;
                    return cleaned;
                }
                return value;
            });
            
        } else if (actionType === 'city-normalization') {
            fixes.forEach(fix => {
                const rowIndex = fix.rowNumber - 2;
                if (rowIndex >= 0 && rowIndex < columnData.length) {
                    columnData[rowIndex] = fix.suggestedFix;
                    fixedRows.add(fix.rowNumber);
                    fixedCount++;
                }
            });
            
        } else if (actionType === 'ai-validation') {
            // AI-powered validation - apply fixes suggested by Claude
            console.log('Applying AI-suggested fixes...');
            
            fixes.forEach(fix => {
                const rowIndex = fix.rowNumber - 2;
                if (rowIndex >= 0 && rowIndex < columnData.length) {
                    columnData[rowIndex] = fix.suggestedFix;
                    fixedRows.add(fix.rowNumber);
                    fixedCount++;
                }
            });
            
            console.log('Applied', fixedCount, 'AI-suggested fixes');
        }
        
        // WRITE CHANGES BACK TO EXCEL FILE (skip for duplicates as already done)
        if (actionType !== 'duplicates') {
            console.log('Writing fixes back to Excel file...');
            
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(uploadedFilePath);
                const worksheet = workbook.worksheets[0];
                
                const headerRow = worksheet.getRow(1);
                let targetColumnIndex = -1;
                headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    if (String(cell.value) === columnName) {
                        targetColumnIndex = colNumber;
                    }
                });
                
                if (targetColumnIndex === -1) {
                    throw new Error('Column "' + columnName + '" not found in Excel');
                }
                
                // Update cell values
                columnData.forEach((value, index) => {
                    const rowNumber = index + 2;
                    const row = worksheet.getRow(rowNumber);
                    row.getCell(targetColumnIndex).value = value;
                });
                
                // Track ONLY rows that were actually fixed
                // For data-format-validation, include the subtype name in the action
                let actionName = actionType;
                if (actionType === 'data-format-validation' && subtype) {
                    actionName = `format-${subtype}`;
                }
                    
                fixedRows.forEach(rowNumber => {
                    updateChangesLog(worksheet, rowNumber, columnName, actionName);
                });
                
                await workbook.xlsx.writeFile(uploadedFilePath);
                console.log(`Saved changes to Excel file. Tracked ${fixedRows.size} fixed rows.`);
                
            } catch (writeError) {
                console.error('Error writing to Excel:', writeError);
            }
        }
        
        // Update shared state
        rawExcelData[columnName] = columnData;
        
        // Recalculate statistics
        const newStats = {
            totalRecords: columnData.length,
            emptyRecords: columnData.filter(v => v === null || v === undefined || v === '').length,
            uniqueValues: new Set(columnData.filter(v => v)).size
        };
        
        const valueCountMap = {};
        columnData.filter(v => v).forEach(v => {
            const key = String(v);
            valueCountMap[key] = (valueCountMap[key] || 0) + 1;
        });
        newStats.duplicates = Object.values(valueCountMap).filter(count => count > 1).reduce((sum, count) => sum + count, 0);
        
        if (phase3Configuration) {
            const colIndex = phase3Configuration.columns.findIndex(col => col.name === columnName);
            if (colIndex !== -1) {
                phase3Configuration.columns[colIndex] = {
                    ...phase3Configuration.columns[colIndex],
                    ...newStats
                };
            }
        }
        
        console.log('Fixed', fixedCount, 'records');
        console.log('New stats - Empty:', newStats.emptyRecords, 'Duplicates:', newStats.duplicates);
        
        res.json({
            success: true,
            fixedCount,
            newStats,
            message: 'Successfully fixed ' + fixedCount + ' issues in "' + columnName + '"'
        });
        
    } catch (error) {
        console.error('Error applying fixes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/phase3/update-cell - Update a single cell and track the change
router.post('/api/phase3/update-cell', async (req, res) => {
    try {
        const { rowNumber, columnName, newValue } = req.body;
        
        console.log(`📝 Updating cell: Row ${rowNumber}, Column ${columnName} = "${newValue}"`);
        
        const rawExcelData = req.app.locals.rawExcelData;
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        if (!rawExcelData[columnName]) {
            return res.status(404).json({ error: 'Column not found' });
        }
        
        // Get original value
        const arrayIndex = rowNumber - 2;
        const originalValue = rawExcelData[columnName][arrayIndex];
        
        // Update in-memory data
        rawExcelData[columnName][arrayIndex] = newValue || '';
        
        // Update Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        // Find column index
        const headerRow = worksheet.getRow(1);
        let columnIndex = -1;
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value === columnName) {
                columnIndex = colNumber;
            }
        });
        
        if (columnIndex === -1) {
            return res.status(404).json({ error: 'Column not found in Excel' });
        }
        
        // Update cell
        const cell = worksheet.getRow(rowNumber).getCell(columnIndex);
        cell.value = newValue || '';
        
        // Track change in _CHANGES_LOG metadata with specific action
        const action = (newValue === '') ? 'cleared' : 
                      (newValue !== originalValue) ? 'manual-edit' : 'kept';
        updateChangesLog(worksheet, rowNumber, columnName, action);
        
        // Save
        await workbook.xlsx.writeFile(uploadedFilePath);
        
        console.log(`✓ Tracked change: ${action}`);
        
        res.json({ 
            success: true,
            message: 'Cell updated and tracked'
        });
        
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// POST /api/phase3/mark-row-delete - Mark a row for deletion
router.post('/api/phase3/mark-row-delete', async (req, res) => {
    try {
        const { rowNumber, columnName, reason } = req.body;
        
        console.log(`🗑️ Marking row ${rowNumber} for deletion. Reason: ${reason}`);
        
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        // Update Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        // Mark the row for deletion
        markRowForDeletion(worksheet, rowNumber, reason || 'MANUAL_DELETE');
        
        // Also log in changes
        updateChangesLog(worksheet, rowNumber, columnName, 'row-deleted');
        
        // Save
        await workbook.xlsx.writeFile(uploadedFilePath);
        
        console.log(`✓ Row ${rowNumber} marked for deletion`);
        
        res.json({ 
            success: true,
            message: `Row ${rowNumber} marked for deletion`
        });
        
    } catch (error) {
        console.error('Error marking row for deletion:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

export default router;
