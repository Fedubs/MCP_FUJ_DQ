// Phase 3: Operations - Duplicate rows, delete, update cells, change logging
// ✅ UPDATED: Now uses consistent _CHANGES_LOG format with fixes.js
//    Format: "Column1:action1|action2,Column2:action1"
//    - Comma separates different columns
//    - Pipe separates multiple actions on same column
import express from 'express';
import ExcelJS from 'exceljs';

const router = express.Router();

// ===== HELPER: Update _CHANGES_LOG in Excel file =====
// Uses consistent format: "Column1:action1|action2,Column2:action1"
async function updateChangesLogInExcel(uploadedFilePath, rowNumber, columnName, action) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadedFilePath);
    const worksheet = workbook.worksheets[0];
    
    // Find or create _CHANGES_LOG column
    const headerRow = worksheet.getRow(1);
    let changesLogIndex = -1;
    
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === '_CHANGES_LOG') {
            changesLogIndex = colNumber;
        }
    });
    
    if (changesLogIndex === -1) {
        changesLogIndex = headerRow.actualCellCount + 1;
        headerRow.getCell(changesLogIndex).value = '_CHANGES_LOG';
        console.log(`✅ Created _CHANGES_LOG column at index ${changesLogIndex}`);
    }
    
    // Get current value and parse it
    const row = worksheet.getRow(rowNumber);
    const changesCell = row.getCell(changesLogIndex);
    const existingChanges = changesCell.value ? String(changesCell.value) : '';
    
    // Parse existing: "Column1:action1|action2,Column2:action1"
    const changesMap = {};
    if (existingChanges) {
        existingChanges.split(',').forEach(entry => {
            const colonIdx = entry.indexOf(':');
            if (colonIdx > 0) {
                const col = entry.substring(0, colonIdx).trim();
                const actions = entry.substring(colonIdx + 1).trim();
                changesMap[col] = actions;
            }
        });
    }
    
    // Append action with pipe separator (don't duplicate same action)
    if (changesMap[columnName]) {
        const existingActions = changesMap[columnName].split('|');
        if (!existingActions.includes(action)) {
            changesMap[columnName] = changesMap[columnName] + '|' + action;
        }
    } else {
        changesMap[columnName] = action;
    }
    
    // Convert back to string
    const newChangesStr = Object.entries(changesMap)
        .map(([col, actions]) => `${col}:${actions}`)
        .join(',');
    
    changesCell.value = newChangesStr;
    
    // Save file
    await workbook.xlsx.writeFile(uploadedFilePath);
    console.log(`✅ Updated _CHANGES_LOG row ${rowNumber}: ${newChangesStr}`);
    
    return newChangesStr;
}

// ===== HELPER: Update _ROW_DELETE column in Excel file =====
async function updateRowDeleteInExcel(uploadedFilePath, rowNumber, value) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadedFilePath);
    const worksheet = workbook.worksheets[0];
    
    // Find or create _ROW_DELETE column
    const headerRow = worksheet.getRow(1);
    let rowDeleteIndex = -1;
    
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === '_ROW_DELETE') {
            rowDeleteIndex = colNumber;
        }
    });
    
    if (rowDeleteIndex === -1) {
        rowDeleteIndex = headerRow.actualCellCount + 1;
        headerRow.getCell(rowDeleteIndex).value = '_ROW_DELETE';
        console.log(`✅ Created _ROW_DELETE column at index ${rowDeleteIndex}`);
    }
    
    // Set value
    const row = worksheet.getRow(rowNumber);
    row.getCell(rowDeleteIndex).value = value;
    
    // Save file
    await workbook.xlsx.writeFile(uploadedFilePath);
    console.log(`✅ Updated _ROW_DELETE row ${rowNumber}: ${value}`);
}

// POST /api/phase3/get-duplicate-rows - Get all rows with duplicate value
router.post('/api/phase3/get-duplicate-rows', (req, res) => {
    try {
        const { columnName, duplicateValue } = req.body;
        const storage = req.app.locals.phase3Storage;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        console.log(`Fetching duplicate rows for ${columnName} = ${duplicateValue}`);

        const rawData = storage.rawData;
        const columnData = rawData[columnName];
        
        if (!columnData) {
            return res.status(404).json({ success: false, error: 'Column not found' });
        }

        const duplicateRows = [];
        columnData.forEach((value, index) => {
            if (String(value) === String(duplicateValue)) {
                const rowData = {};
                Object.keys(rawData).forEach(colName => {
                    if (!colName.startsWith('_') || colName === '_CHANGES_LOG') {
                        rowData[colName] = rawData[colName][index];
                    }
                });

                // Check if this row has any logged actions
                const changesLog = rawData['_CHANGES_LOG'] ? rawData['_CHANGES_LOG'][index] : '';
                
                // Parse action status for this column (new format: comma-separated columns, pipe-separated actions)
                let actionStatus = null;
                if (changesLog) {
                    // Split by comma to get each column entry
                    changesLog.split(',').forEach(entry => {
                        const colonIdx = entry.indexOf(':');
                        if (colonIdx > 0) {
                            const col = entry.substring(0, colonIdx).trim();
                            if (col === columnName) {
                                const actions = entry.substring(colonIdx + 1).trim();
                                const actionList = actions.split('|');
                                
                                if (actionList.includes('duplicates') || actionList.includes('deleted')) {
                                    actionStatus = { action: 'delete', log: 'Delete entire row' };
                                } else if (actionList.includes('KEEP') || actionList.includes('kept')) {
                                    actionStatus = { action: 'keep', log: 'Keep row' };
                                } else {
                                    // Check for edit format (OldValue→NewValue)
                                    for (const act of actionList) {
                                        if (act.includes('→')) {
                                            const [originalVal, newVal] = act.split('→');
                                            actionStatus = { action: 'edit', log: 'Edit value', originalValue: originalVal, newValue: newVal };
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }

                duplicateRows.push({
                    rowNumber: index + 2,
                    data: rowData,
                    actionStatus: actionStatus
                });
            }
        });

        console.log(`Found ${duplicateRows.length} duplicate rows`);

        res.json({
            success: true,
            rows: duplicateRows
        });

    } catch (error) {
        console.error('Error fetching duplicate rows:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase3/log-change - Log a change to _CHANGES_LOG (writes to Excel file)
// ✅ UPDATED: Uses consistent format with fixes.js
router.post('/api/phase3/log-change', async (req, res) => {
    try {
        const { rowNumber, columnName, changeType, originalValue, newValue } = req.body;
        const storage = req.app.locals.phase3Storage;
        const uploadedFilePath = req.app.locals.uploadedFilePath;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        if (!uploadedFilePath) {
            return res.status(404).json({ success: false, error: 'No file path found' });
        }

        const rawData = storage.rawData;
        const arrayIndex = rowNumber - 2;

        // Ensure _CHANGES_LOG column exists in memory
        if (!rawData['_CHANGES_LOG']) {
            rawData['_CHANGES_LOG'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
        }

        // Ensure _ROW_DELETE column exists for tracking row deletions
        if (!rawData['_ROW_DELETE']) {
            rawData['_ROW_DELETE'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
        }

        // Determine action name
        let actionName = '';
        if (changeType === 'DELETE_ROW') {
            actionName = 'duplicates';  // Use consistent name with fixes.js
            rawData['_ROW_DELETE'][arrayIndex] = 'DUPLICATE';
            await updateRowDeleteInExcel(uploadedFilePath, rowNumber, 'DUPLICATE');
        } else if (changeType === 'KEEP') {
            actionName = 'kept';
            rawData['_ROW_DELETE'][arrayIndex] = '';
            await updateRowDeleteInExcel(uploadedFilePath, rowNumber, '');
        } else if (changeType === 'EDIT') {
            actionName = `${originalValue}→${newValue}`;
            rawData['_ROW_DELETE'][arrayIndex] = '';
            await updateRowDeleteInExcel(uploadedFilePath, rowNumber, '');
        }

        // Update Excel file with new format
        const finalLogValue = await updateChangesLogInExcel(uploadedFilePath, rowNumber, columnName, actionName);

        // Update memory to match
        rawData['_CHANGES_LOG'][arrayIndex] = finalLogValue;

        console.log(`✓ Logged change for row ${rowNumber}: ${columnName}:${actionName}`);

        res.json({ success: true, message: 'Change logged' });

    } catch (error) {
        console.error('Error logging change:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase3/clear-change-log - Clear change log entry for a specific row/column
router.post('/api/phase3/clear-change-log', async (req, res) => {
    try {
        const { rowNumber, columnName } = req.body;
        const storage = req.app.locals.phase3Storage;
        const uploadedFilePath = req.app.locals.uploadedFilePath;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        const rawData = storage.rawData;
        const arrayIndex = rowNumber - 2;

        // Read Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        const worksheet = workbook.worksheets[0];
        
        // Find _CHANGES_LOG column
        const headerRow = worksheet.getRow(1);
        let changesLogIndex = -1;
        let rowDeleteIndex = -1;
        
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value === '_CHANGES_LOG') {
                changesLogIndex = colNumber;
            } else if (cell.value === '_ROW_DELETE') {
                rowDeleteIndex = colNumber;
            }
        });

        // Update _CHANGES_LOG - remove entry for this column
        let finalLogValue = '';
        if (changesLogIndex > 0) {
            const row = worksheet.getRow(rowNumber);
            const existingLog = row.getCell(changesLogIndex).value?.toString() || '';
            
            if (existingLog) {
                // Parse and filter out this column's entry
                const entries = existingLog.split(',').filter(entry => {
                    const colonIdx = entry.indexOf(':');
                    if (colonIdx > 0) {
                        const col = entry.substring(0, colonIdx).trim();
                        return col !== columnName;
                    }
                    return true;
                });
                finalLogValue = entries.join(',');
                row.getCell(changesLogIndex).value = finalLogValue;
            }
        }

        // Clear _ROW_DELETE if it exists
        if (rowDeleteIndex > 0) {
            worksheet.getRow(rowNumber).getCell(rowDeleteIndex).value = '';
        }

        // Save file
        await workbook.xlsx.writeFile(uploadedFilePath);

        // Update memory
        if (rawData['_CHANGES_LOG']) {
            rawData['_CHANGES_LOG'][arrayIndex] = finalLogValue;
        }
        if (rawData['_ROW_DELETE']) {
            rawData['_ROW_DELETE'][arrayIndex] = '';
        }

        console.log(`✓ Cleared change log for row ${rowNumber}, column ${columnName}`);

        res.json({ success: true, message: 'Change log cleared' });

    } catch (error) {
        console.error('Error clearing change log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase3/delete-row - Mark row for deletion
router.post('/api/phase3/delete-row', async (req, res) => {
    try {
        const { rowNumber, columnName } = req.body;
        const storage = req.app.locals.phase3Storage;
        const uploadedFilePath = req.app.locals.uploadedFilePath;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        const rawData = storage.rawData;
        const arrayIndex = rowNumber - 2;

        // Update _ROW_DELETE in memory
        if (!rawData['_ROW_DELETE']) {
            rawData['_ROW_DELETE'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
        }
        rawData['_ROW_DELETE'][arrayIndex] = 'DUPLICATE';

        // Update Excel file
        if (uploadedFilePath) {
            await updateRowDeleteInExcel(uploadedFilePath, rowNumber, 'DUPLICATE');
            
            // Also log to _CHANGES_LOG with column name
            const colName = columnName || 'ROW';
            const finalLogValue = await updateChangesLogInExcel(uploadedFilePath, rowNumber, colName, 'duplicates');
            
            if (!rawData['_CHANGES_LOG']) {
                rawData['_CHANGES_LOG'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
            }
            rawData['_CHANGES_LOG'][arrayIndex] = finalLogValue;
        }

        console.log(`✓ Row ${rowNumber} marked for deletion`);

        res.json({ success: true, message: `Row ${rowNumber} marked for deletion` });

    } catch (error) {
        console.error('Error marking row for deletion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase3/update-cell - Update a specific cell value
router.post('/api/phase3/update-cell', (req, res) => {
    try {
        const { rowNumber, columnName, newValue } = req.body;
        const storage = req.app.locals.phase3Storage;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        const rawData = storage.rawData;
        const arrayIndex = rowNumber - 2;

        if (!rawData[columnName]) {
            return res.status(404).json({ success: false, error: 'Column not found' });
        }

        const originalValue = rawData[columnName][arrayIndex];

        console.log(`Updating row ${rowNumber}, column ${columnName}: "${originalValue}" → "${newValue}"`);

        rawData[columnName][arrayIndex] = newValue;

        // Track the change for Phase 4 review
        if (!req.app.locals.phase3Changes) {
            req.app.locals.phase3Changes = [];
        }

        let action = 'changed';
        if (newValue === '') {
            action = 'rejected';
        } else if (newValue === originalValue) {
            action = 'kept';
        }

        const existingIndex = req.app.locals.phase3Changes.findIndex(
            c => c.rowNumber === rowNumber && c.columnName === columnName
        );

        const changeRecord = {
            rowNumber,
            columnName,
            originalValue,
            newValue,
            action,
            timestamp: new Date().toISOString()
        };

        if (existingIndex !== -1) {
            req.app.locals.phase3Changes[existingIndex] = changeRecord;
        } else {
            req.app.locals.phase3Changes.push(changeRecord);
        }

        console.log(`✓ Cell updated and tracked (Total changes: ${req.app.locals.phase3Changes.length})`);

        res.json({ success: true, message: 'Cell updated' });

    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
