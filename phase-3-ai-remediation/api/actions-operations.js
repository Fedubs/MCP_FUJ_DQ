// Phase 3: Operations - Duplicate rows, delete, update cells, change logging
// ✅ UPDATED: Now writes _CHANGES_LOG to Excel file (not just memory)
import express from 'express';
import ExcelJS from 'exceljs';

const router = express.Router();

// ===== HELPER: Write _CHANGES_LOG to Excel file =====
async function writeChangesLogToExcel(uploadedFilePath, rowNumber, logValue) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadedFilePath);
    const worksheet = workbook.worksheets[0];
    
    // Find _CHANGES_LOG column
    const headerRow = worksheet.getRow(1);
    let changesLogIndex = -1;
    
    headerRow.eachCell((cell, colNumber) => {
        if (cell.value === '_CHANGES_LOG') {
            changesLogIndex = colNumber;
        }
    });
    
    // If column doesn't exist, create it
    if (changesLogIndex === -1) {
        changesLogIndex = headerRow.actualCellCount + 1;
        headerRow.getCell(changesLogIndex).value = '_CHANGES_LOG';
        console.log(`✅ Created _CHANGES_LOG column at index ${changesLogIndex}`);
    }
    
    // Write the log value
    const row = worksheet.getRow(rowNumber);
    row.getCell(changesLogIndex).value = logValue;
    
    // Save file
    await workbook.xlsx.writeFile(uploadedFilePath);
    console.log(`✅ Wrote to Excel _CHANGES_LOG row ${rowNumber}: ${logValue}`);
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
            // Return ALL rows with matching value (don't filter out deleted ones)
            if (String(value) === String(duplicateValue)) {
                const rowData = {};
                Object.keys(rawData).forEach(colName => {
                    // Include _CHANGES_LOG for visibility, exclude other internal columns
                    if (!colName.startsWith('_') || colName === '_CHANGES_LOG') {
                        rowData[colName] = rawData[colName][index];
                    }
                });

                // Check if this row has any logged actions
                const changesLog = rawData['_CHANGES_LOG'] ? rawData['_CHANGES_LOG'][index] : '';
                
                // Parse action status for this column
                let actionStatus = null;
                if (changesLog) {
                    const entries = changesLog.split('|');
                    for (const entry of entries) {
                        if (entry.startsWith(`${columnName}:`)) {
                            const action = entry.substring(columnName.length + 1);
                            if (action === 'DELETE_ROW') {
                                actionStatus = { action: 'delete', log: 'Delete entire row' };
                            } else if (action === 'KEEP') {
                                actionStatus = { action: 'keep', log: 'Keep row' };
                            } else if (action.includes('→')) {
                                const [originalVal, newVal] = action.split('→');
                                actionStatus = { action: 'edit', log: 'Edit value', originalValue: originalVal, newValue: newVal };
                            }
                            break;
                        }
                    }
                }

                duplicateRows.push({
                    rowNumber: index + 2,
                    data: rowData,
                    actionStatus: actionStatus // Include action status if exists
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

        // Build the log entry
        let logEntry = '';
        if (changeType === 'DELETE_ROW') {
            logEntry = `${columnName}:DELETE_ROW`;
            rawData['_ROW_DELETE'][arrayIndex] = 'DUPLICATE';
        } else if (changeType === 'KEEP') {
            logEntry = `${columnName}:KEEP`;
            rawData['_ROW_DELETE'][arrayIndex] = '';
        } else if (changeType === 'EDIT') {
            logEntry = `${columnName}:${originalValue}→${newValue}`;
            rawData['_ROW_DELETE'][arrayIndex] = '';
        }

        // Get existing log for this row
        let existingLog = rawData['_CHANGES_LOG'][arrayIndex] || '';
        
        // Remove any existing entry for this column
        if (existingLog) {
            const entries = existingLog.split('|').filter(e => !e.startsWith(`${columnName}:`));
            existingLog = entries.join('|');
        }

        // Build final log value
        let finalLogValue = '';
        if (existingLog) {
            finalLogValue = `${existingLog}|${logEntry}`;
        } else {
            finalLogValue = logEntry;
        }

        // Update memory
        rawData['_CHANGES_LOG'][arrayIndex] = finalLogValue;

        // ✅ Write to Excel file
        await writeChangesLogToExcel(uploadedFilePath, rowNumber, finalLogValue);

        console.log(`✓ Logged change for row ${rowNumber}: ${logEntry}`);

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

        // Clear from _CHANGES_LOG in memory
        let finalLogValue = '';
        if (rawData['_CHANGES_LOG'] && rawData['_CHANGES_LOG'][arrayIndex]) {
            const existingLog = rawData['_CHANGES_LOG'][arrayIndex];
            const entries = existingLog.split('|').filter(e => !e.startsWith(`${columnName}:`));
            finalLogValue = entries.join('|');
            rawData['_CHANGES_LOG'][arrayIndex] = finalLogValue;
        }

        // Clear from _ROW_DELETE if it was a delete
        if (rawData['_ROW_DELETE'] && rawData['_ROW_DELETE'][arrayIndex]) {
            rawData['_ROW_DELETE'][arrayIndex] = '';
        }

        // ✅ Write to Excel file
        if (uploadedFilePath) {
            await writeChangesLogToExcel(uploadedFilePath, rowNumber, finalLogValue);
        }

        console.log(`✓ Cleared change log for row ${rowNumber}, column ${columnName}`);

        res.json({ success: true, message: 'Change log cleared' });

    } catch (error) {
        console.error('Error clearing change log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/phase3/delete-row - DEPRECATED: Now using log-change for soft delete
router.post('/api/phase3/delete-row', (req, res) => {
    try {
        const { rowNumber } = req.body;
        const storage = req.app.locals.phase3Storage;

        if (!storage || !storage.rawData) {
            return res.status(404).json({ success: false, error: 'No data loaded' });
        }

        const rawData = storage.rawData;
        const arrayIndex = rowNumber - 2;

        // Soft delete - mark in _ROW_DELETE column instead of actually deleting
        if (!rawData['_ROW_DELETE']) {
            rawData['_ROW_DELETE'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
        }
        rawData['_ROW_DELETE'][arrayIndex] = 'DUPLICATE';

        // Also log to _CHANGES_LOG
        if (!rawData['_CHANGES_LOG']) {
            rawData['_CHANGES_LOG'] = new Array(rawData[Object.keys(rawData)[0]].length).fill('');
        }
        
        let existingLog = rawData['_CHANGES_LOG'][arrayIndex] || '';
        const deleteEntry = 'ROW:DELETE_ROW';
        
        if (existingLog && !existingLog.includes(deleteEntry)) {
            rawData['_CHANGES_LOG'][arrayIndex] = `${existingLog}|${deleteEntry}`;
        } else if (!existingLog) {
            rawData['_CHANGES_LOG'][arrayIndex] = deleteEntry;
        }

        console.log(`✓ Row ${rowNumber} marked for deletion (soft delete)`);

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

        // Determine action type based on values
        let action = 'changed';
        if (newValue === '') {
            action = 'rejected';
        } else if (newValue === originalValue) {
            action = 'kept';
        }

        // Check if this change already exists, update it if so
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
            // Update existing change
            req.app.locals.phase3Changes[existingIndex] = changeRecord;
        } else {
            // Add new change
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
