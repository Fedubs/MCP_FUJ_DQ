// Duplicate Comparison Modal - LOG ONLY (no actual delete/edit until Phase 4)
class DuplicateModal {
    constructor() {
        this.overlay = null;
        this.duplicateValue = null;
        this.duplicateRows = [];
        this.columnName = null;
        this.allColumns = [];
        this.onClose = null;
        this.rowActions = {};
        this.keptRowNumber = null;
        this.allValuesInColumn = [];
    }

    async show(duplicateValue, columnName, allColumns, onClose) {
        this.duplicateValue = duplicateValue;
        this.columnName = columnName;
        this.allColumns = allColumns;
        this.onClose = onClose;
        this.rowActions = {};
        this.keptRowNumber = null;

        await this.fetchDuplicateRows();
        await this.fetchAllColumnValues();
        this.render();
    }

    async fetchDuplicateRows() {
        try {
            const response = await fetch('/api/phase3/get-duplicate-rows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columnName: this.columnName,
                    duplicateValue: this.duplicateValue
                })
            });

            if (!response.ok) throw new Error('Failed to fetch duplicate rows');

            const result = await response.json();
            this.duplicateRows = result.rows;
            
            this.duplicateRows.forEach(row => {
                if (row.actionStatus) {
                    this.rowActions[row.rowNumber] = row.actionStatus;
                    if (row.actionStatus.action === 'keep') {
                        this.keptRowNumber = row.rowNumber;
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching duplicate rows:', error);
            this.duplicateRows = [];
        }
    }

    async fetchAllColumnValues() {
        try {
            const response = await fetch('/api/phase3/raw-data');
            if (!response.ok) throw new Error('Failed to fetch raw data');
            const rawData = await response.json();
            this.allValuesInColumn = rawData[this.columnName] || [];
        } catch (error) {
            console.error('Error fetching column values:', error);
            this.allValuesInColumn = [];
        }
    }

    render() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'duplicate-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'duplicate-modal';

        const header = document.createElement('div');
        header.className = 'duplicate-modal-header';
        header.innerHTML = `
            <h2>🔄 Duplicate Records Comparison</h2>
            <div class="subtitle">
                Column: <strong>${this.escapeHtml(this.columnName)}</strong> | 
                Value: <span class="duplicate-value-highlight">${this.escapeHtml(String(this.duplicateValue))}</span> | 
                Found in ${this.duplicateRows.length} rows
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                ⚠️ Only <strong>one row</strong> can be kept. Others will be deleted or can be edited to a unique value.
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'duplicate-modal-body';
        body.innerHTML = this.renderTable();

        const footer = document.createElement('div');
        footer.className = 'duplicate-modal-footer';
        footer.innerHTML = `<button class="btn-close-modal" onclick="window.duplicateModal.close()">Close</button>`;

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    renderTable() {
        if (this.duplicateRows.length === 0) {
            return '<p style="padding: 2rem; text-align: center;">No duplicate rows found.</p>';
        }

        let html = `<div class="duplicate-table-container"><table class="duplicate-table"><thead><tr>
            <th class="duplicate-actions-cell"></th>
            <th class="duplicate-row-number">ROW #</th>`;

        this.allColumns.forEach(col => {
            html += `<th>${this.escapeHtml(col.name)}</th>`;
        });

        html += `<th style="background: #f0f0f0; color: #666;">_CHANGES_LOG</th></tr></thead><tbody>`;

        this.duplicateRows.forEach((row, index) => {
            const rowId = `dup-row-${index}`;
            const actionStatus = this.rowActions[row.rowNumber];
            const isKeptRow = this.keptRowNumber === row.rowNumber;
            const anotherRowIsKept = this.keptRowNumber !== null && !isKeptRow;
            
            let rowClass = '';
            if (actionStatus) {
                if (actionStatus.action === 'delete' && !anotherRowIsKept) rowClass = 'row-deleted';
                else if (actionStatus.action === 'edit') rowClass = 'row-edited';
                else if (actionStatus.action === 'keep') rowClass = 'row-kept';
            }
            
            html += `<tr id="${rowId}" class="${rowClass}" data-row-number="${row.rowNumber}">
                <td class="duplicate-actions-cell"><div class="duplicate-actions" id="actions-${index}">`;
            
            // Render action buttons based on state
            if (isKeptRow) {
                // This is the KEPT row - show Reset + Keep badge
                html += `<button class="btn-change" onclick="window.duplicateModal.resetKeep(${index})">Reset</button>
                    <span class="badge-keep">✓ Keep</span>`;
            } else if (anotherRowIsKept) {
                // Another row is kept - show Delete (big) + Edit buttons, no Reset
                html += this.renderDeleteEditButtons(index);
            } else if (actionStatus) {
                // Has action but no row is kept yet (e.g., manual delete/edit before choosing keep)
                const badgeClass = actionStatus.action === 'delete' ? 'badge-delete' : 'badge-edit';
                const badgeIcon = actionStatus.action === 'delete' ? '🗑️' : '✎';
                const badgeLabel = actionStatus.action === 'delete' ? 'Delete' : 'Edited';
                
                html += `<button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Reset</button>
                    <span class="${badgeClass}">${badgeIcon} ${badgeLabel}</span>`;
            } else {
                // No action yet, no row kept - show all 3 buttons
                html += this.renderActionButtons(index, row.rowNumber);
            }
            
            html += `</div></td><td class="duplicate-row-number">${row.rowNumber}</td>`;

            this.allColumns.forEach(col => {
                const value = row.data[col.name];
                const isTargetColumn = col.name === this.columnName;
                const cellClass = isTargetColumn ? 'duplicate-value-highlight' : '';
                
                if (isTargetColumn && actionStatus && actionStatus.action === 'edit') {
                    html += `<td><span class="${cellClass}" data-column="${this.escapeHtml(col.name)}">
                        <span style="text-decoration: line-through; color: #999;">${this.escapeHtml(this.formatValue(actionStatus.originalValue))}</span>
                        <span style="color: #28a745; font-weight: bold;"> → ${this.escapeHtml(actionStatus.newValue)}</span>
                    </span></td>`;
                } else {
                    html += `<td><span class="${cellClass}" data-column="${this.escapeHtml(col.name)}">${this.escapeHtml(this.formatValue(value))}</span></td>`;
                }
            });

            const changesLog = row.data['_CHANGES_LOG'] || '';
            html += `<td style="background: #f9f9f9; font-family: monospace; font-size: 0.85em; color: #666;" id="changes-log-${index}">
                ${this.escapeHtml(changesLog) || '<em>(empty)</em>'}</td></tr>`;
        });

        html += `</tbody></table></div>`;
        return html;
    }

    // Render Delete (big) + Edit buttons for non-kept rows when a row is kept
    renderDeleteEditButtons(index) {
        return `<button class="btn-delete-dup btn-delete-large" onclick="window.duplicateModal.confirmDelete(${index})">🗑️ Delete</button>
            <button class="btn-edit-dup" onclick="window.duplicateModal.editRow(${index})">Edit</button>`;
    }

    renderActionButtons(index, rowNumber) {
        const anotherRowIsKept = this.keptRowNumber !== null && this.keptRowNumber !== rowNumber;
        
        let html = `<button class="btn-delete-dup" onclick="window.duplicateModal.deleteRow(${index})">Delete</button>`;
        
        if (anotherRowIsKept) {
            html += `<button class="btn-keep-dup" disabled style="opacity: 0.5; cursor: not-allowed;" title="Another row is already marked as Keep">Keep</button>`;
        } else {
            html += `<button class="btn-keep-dup" onclick="window.duplicateModal.keepRow(${index})">Keep</button>`;
        }
        
        html += `<button class="btn-edit-dup" onclick="window.duplicateModal.editRow(${index})">Edit</button>`;
        return html;
    }

    // Refresh UI for all rows after keep/reset
    refreshAllRows() {
        this.duplicateRows.forEach((row, index) => {
            const actionsDiv = document.getElementById(`actions-${index}`);
            const rowElement = document.getElementById(`dup-row-${index}`);
            if (!actionsDiv || !rowElement) return;
            
            const actionStatus = this.rowActions[row.rowNumber];
            const isKeptRow = this.keptRowNumber === row.rowNumber;
            const anotherRowIsKept = this.keptRowNumber !== null && !isKeptRow;
            
            // Update row classes
            rowElement.classList.remove('row-deleted', 'row-kept', 'row-edited');
            if (actionStatus) {
                if (actionStatus.action === 'keep') rowElement.classList.add('row-kept');
                else if (actionStatus.action === 'edit') rowElement.classList.add('row-edited');
                else if (actionStatus.action === 'delete' && !anotherRowIsKept) rowElement.classList.add('row-deleted');
            }
            
            // Update action buttons
            if (isKeptRow) {
                actionsDiv.innerHTML = `<button class="btn-change" onclick="window.duplicateModal.resetKeep(${index})">Reset</button>
                    <span class="badge-keep">✓ Keep</span>`;
            } else if (anotherRowIsKept) {
                actionsDiv.innerHTML = this.renderDeleteEditButtons(index);
            } else if (actionStatus) {
                const badgeClass = actionStatus.action === 'delete' ? 'badge-delete' : 'badge-edit';
                const badgeIcon = actionStatus.action === 'delete' ? '🗑️' : '✎';
                const badgeLabel = actionStatus.action === 'delete' ? 'Delete' : 'Edited';
                
                actionsDiv.innerHTML = `<button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Reset</button>
                    <span class="${badgeClass}">${badgeIcon} ${badgeLabel}</span>`;
            } else {
                actionsDiv.innerHTML = this.renderActionButtons(index, row.rowNumber);
            }
        });
    }

    updateChangesLogCell(index, logValue) {
        const cell = document.getElementById(`changes-log-${index}`);
        if (cell) cell.innerHTML = this.escapeHtml(logValue) || '<em>(empty)</em>';
    }

    // Reset the KEEP row - clears keep and all auto-deletes
    async resetKeep(index) {
        const row = this.duplicateRows[index];
        
        // Clear the keep log
        try {
            await fetch('/api/phase3/clear-change-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowNumber: row.rowNumber, columnName: this.columnName })
            });
            row.data['_CHANGES_LOG'] = '';
            this.updateChangesLogCell(index, '');
        } catch (error) {
            console.error('Error clearing change log:', error);
        }
        
        delete this.rowActions[row.rowNumber];
        this.keptRowNumber = null;
        
        // Clear all auto-delete rows
        for (let i = 0; i < this.duplicateRows.length; i++) {
            if (i === index) continue;
            const otherRow = this.duplicateRows[i];
            if (this.rowActions[otherRow.rowNumber] && this.rowActions[otherRow.rowNumber].action === 'delete') {
                try {
                    await fetch('/api/phase3/clear-change-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rowNumber: otherRow.rowNumber, columnName: this.columnName })
                    });
                    otherRow.data['_CHANGES_LOG'] = '';
                    this.updateChangesLogCell(i, '');
                } catch (error) {
                    console.error('Error clearing change log:', error);
                }
                delete this.rowActions[otherRow.rowNumber];
            }
        }
        
        this.refreshAllRows();
        this.showToast(`Keep selection cleared`);
    }

    async resetRow(index) {
        const row = this.duplicateRows[index];
        const previousAction = this.rowActions[row.rowNumber];
        
        if (previousAction) {
            try {
                await fetch('/api/phase3/clear-change-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rowNumber: row.rowNumber, columnName: this.columnName })
                });
                row.data['_CHANGES_LOG'] = '';
                this.updateChangesLogCell(index, '');
            } catch (error) {
                console.error('Error clearing change log:', error);
            }
        }
        
        delete this.rowActions[row.rowNumber];
        
        const rowElement = document.getElementById(`dup-row-${index}`);
        rowElement.classList.remove('row-deleted', 'row-kept', 'row-edited');
        
        if (previousAction && previousAction.action === 'edit' && previousAction.originalValue !== undefined) {
            const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
            if (targetCell) targetCell.innerHTML = this.escapeHtml(this.formatValue(previousAction.originalValue));
        }
        
        this.refreshAllRows();
        this.showToast(`Row ${row.rowNumber} reset`);
    }

    // Confirm delete stays as delete (for when clicking Delete button on already-delete row)
    async confirmDelete(index) {
        const row = this.duplicateRows[index];
        
        // Already marked as delete, just show toast
        if (this.rowActions[row.rowNumber] && this.rowActions[row.rowNumber].action === 'delete') {
            this.showToast(`Row ${row.rowNumber} will be deleted`);
            return;
        }
        
        // Otherwise mark as delete
        await this.deleteRow(index);
    }

    async deleteRow(index, silent = false) {
        const row = this.duplicateRows[index];

        try {
            const response = await fetch('/api/phase3/log-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: row.rowNumber,
                    columnName: this.columnName,
                    changeType: 'DELETE_ROW',
                    originalValue: row.data[this.columnName],
                    newValue: null
                })
            });

            if (!response.ok) throw new Error('Failed to log change');

            this.rowActions[row.rowNumber] = { action: 'delete', log: 'Delete entire row' };

            const logEntry = `${this.columnName}:DELETE_ROW`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            // Only add strikethrough class if no row is kept (manual delete mode)
            if (!this.keptRowNumber) {
                document.getElementById(`dup-row-${index}`).classList.add('row-deleted');
                const actionsDiv = document.getElementById(`actions-${index}`);
                actionsDiv.innerHTML = `<button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Reset</button>
                    <span class="badge-delete">🗑️ Delete</span>`;
            }
            
            if (!silent) {
                this.showToast(`Row ${row.rowNumber} marked for deletion`);
            }

        } catch (error) {
            console.error('Error logging delete:', error);
            if (!silent) {
                alert('Error marking row for deletion: ' + error.message);
            }
        }
    }

    async editRow(index) {
        const row = this.duplicateRows[index];
        const rowElement = document.getElementById(`dup-row-${index}`);
        const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
        if (!targetCell) return;

        const currentValue = row.data[this.columnName];

        targetCell.innerHTML = `
            <input type="text" class="inline-edit-input" value="${this.escapeHtml(String(currentValue))}"
                   id="edit-input-${index}" data-original-value="${this.escapeHtml(String(currentValue))}"
                   onkeypress="if(event.key === 'Enter') window.duplicateModal.saveEdit(${index})">
            <div class="inline-edit-actions">
                <button class="btn-save-edit" onclick="window.duplicateModal.saveEdit(${index})">Save</button>
                <button class="btn-cancel-edit" onclick="window.duplicateModal.cancelEdit(${index}, '${this.escapeHtml(String(currentValue))}')">Cancel</button>
            </div>
            <div id="edit-error-${index}" style="color: #dc3545; font-size: 0.85rem; margin-top: 0.25rem; display: none;"></div>`;

        document.getElementById(`edit-input-${index}`).focus();
    }

    async saveEdit(index) {
        const row = this.duplicateRows[index];
        const input = document.getElementById(`edit-input-${index}`);
        const errorDiv = document.getElementById(`edit-error-${index}`);
        const newValue = input.value.trim();
        const originalValue = input.getAttribute('data-original-value');

        errorDiv.style.display = 'none';

        if (!newValue) {
            errorDiv.textContent = '❌ Value cannot be empty';
            errorDiv.style.display = 'block';
            return;
        }

        // FIRST: Check if new value is a duplicate
        const isDuplicate = this.checkIfValueIsDuplicate(newValue, row.rowNumber);
        if (isDuplicate) {
            errorDiv.textContent = `❌ "${newValue}" already exists in this column. Enter a unique value.`;
            errorDiv.style.display = 'block';
            input.focus();
            input.select();
            return;
        }

        // If value hasn't changed, just cancel
        if (newValue === originalValue) {
            this.cancelEdit(index, originalValue);
            return;
        }

        try {
            const response = await fetch('/api/phase3/log-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: row.rowNumber,
                    columnName: this.columnName,
                    changeType: 'EDIT',
                    originalValue: originalValue,
                    newValue: newValue
                })
            });

            if (!response.ok) throw new Error('Failed to log change');

            this.rowActions[row.rowNumber] = {
                action: 'edit',
                log: 'Edit value',
                originalValue: originalValue,
                newValue: newValue
            };

            const logEntry = `${this.columnName}:${originalValue}→${newValue}`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            const rowElement = document.getElementById(`dup-row-${index}`);
            rowElement.classList.remove('row-deleted');
            rowElement.classList.add('row-edited');
            
            const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
            targetCell.innerHTML = `<span style="text-decoration: line-through; color: #999;">${this.escapeHtml(originalValue)}</span>
                <span style="color: #28a745; font-weight: bold;"> → ${this.escapeHtml(newValue)}</span>`;
            
            // Update action buttons
            const actionsDiv = document.getElementById(`actions-${index}`);
            if (this.keptRowNumber !== null) {
                // A row is kept, show Delete + Edit
                actionsDiv.innerHTML = this.renderDeleteEditButtons(index);
            } else {
                actionsDiv.innerHTML = `<button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Reset</button>
                    <span class="badge-edit">✎ Edited</span>`;
            }
            
            this.showToast(`Row ${row.rowNumber} edit logged`);

        } catch (error) {
            console.error('Error logging edit:', error);
            alert('Error logging edit: ' + error.message);
        }
    }

    checkIfValueIsDuplicate(value, excludeRowNumber) {
        const normalizedValue = String(value).trim();
        const originalDuplicateValue = String(this.duplicateValue).trim();
        
        if (normalizedValue === originalDuplicateValue) return true;
        if (normalizedValue.toLowerCase() === originalDuplicateValue.toLowerCase()) return true;
        
        for (let i = 0; i < this.allValuesInColumn.length; i++) {
            const rowNumber = i + 2;
            if (rowNumber === excludeRowNumber) continue;
            const existingValue = String(this.allValuesInColumn[i] || '').trim();
            if (existingValue.toLowerCase() === normalizedValue.toLowerCase()) return true;
        }
        
        for (const rowNum in this.rowActions) {
            if (parseInt(rowNum) === excludeRowNumber) continue;
            const action = this.rowActions[rowNum];
            if (action.action === 'edit' && action.newValue) {
                if (String(action.newValue).trim().toLowerCase() === normalizedValue.toLowerCase()) return true;
            }
        }
        
        return false;
    }

    cancelEdit(index, originalValue) {
        const rowElement = document.getElementById(`dup-row-${index}`);
        const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
        targetCell.innerHTML = this.escapeHtml(originalValue);
        
        // Restore proper action buttons
        this.refreshAllRows();
    }

    async keepRow(index) {
        const row = this.duplicateRows[index];

        if (this.keptRowNumber !== null && this.keptRowNumber !== row.rowNumber) {
            alert('Another row is already marked as Keep. Reset it first.');
            return;
        }

        try {
            // 1. Mark this row as KEEP
            const response = await fetch('/api/phase3/log-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: row.rowNumber,
                    columnName: this.columnName,
                    changeType: 'KEEP',
                    originalValue: row.data[this.columnName],
                    newValue: row.data[this.columnName]
                })
            });

            if (!response.ok) throw new Error('Failed to log change');

            this.keptRowNumber = row.rowNumber;
            this.rowActions[row.rowNumber] = { action: 'keep', log: 'Keep row' };

            const logEntry = `${this.columnName}:KEEP`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            // 2. Auto-mark ALL OTHER rows as DELETE (if they don't already have an action)
            for (let i = 0; i < this.duplicateRows.length; i++) {
                if (i === index) continue;
                const otherRow = this.duplicateRows[i];
                if (!this.rowActions[otherRow.rowNumber]) {
                    await this.deleteRow(i, true);
                }
            }

            // 3. Refresh all row UI
            this.refreshAllRows();
            this.showToast(`Row ${row.rowNumber} kept, others marked for deletion`);

        } catch (error) {
            console.error('Error logging keep:', error);
            alert('Error marking row to keep: ' + error.message);
        }
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.onClose) this.onClose(this.rowActions, this.duplicateValue);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #28a745; color: white;
            padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 11000; font-weight: 500;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    formatValue(value) {
        if (value === null || value === undefined || value === '') return '(empty)';
        return String(value);
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

window.duplicateModal = new DuplicateModal();
