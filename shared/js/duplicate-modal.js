// Duplicate Comparison Modal - LOG ONLY (no actual delete/edit until Phase 4)
class DuplicateModal {
    constructor() {
        this.overlay = null;
        this.duplicateValue = null;
        this.duplicateRows = [];
        this.columnName = null;
        this.allColumns = [];
        this.onClose = null;
        this.rowActions = {}; // Track actions: { rowNumber: { action: 'delete'|'keep'|'edit', log: '...' } }
    }

    async show(duplicateValue, columnName, allColumns, onClose) {
        this.duplicateValue = duplicateValue;
        this.columnName = columnName;
        this.allColumns = allColumns;
        this.onClose = onClose;
        this.rowActions = {}; // Reset actions

        await this.fetchDuplicateRows();
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
            
            // Restore action states from server response
            this.duplicateRows.forEach(row => {
                if (row.actionStatus) {
                    this.rowActions[row.rowNumber] = row.actionStatus;
                }
            });

        } catch (error) {
            console.error('Error fetching duplicate rows:', error);
            this.duplicateRows = [];
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
        `;

        const body = document.createElement('div');
        body.className = 'duplicate-modal-body';
        body.innerHTML = this.renderTable();

        const footer = document.createElement('div');
        footer.className = 'duplicate-modal-footer';
        footer.innerHTML = `
            <button class="btn-close-modal" onclick="window.duplicateModal.close()">Close</button>
        `;

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    renderTable() {
        if (this.duplicateRows.length === 0) {
            return '<p style="padding: 2rem; text-align: center;">No duplicate rows found.</p>';
        }

        let html = `
            <div class="duplicate-table-container">
                <table class="duplicate-table">
                    <thead>
                        <tr>
                            <th class="duplicate-actions-cell"></th>
                            <th class="duplicate-row-number">ROW #</th>
        `;

        // Add all columns from config
        this.allColumns.forEach(col => {
            html += `<th>${this.escapeHtml(col.name)}</th>`;
        });

        // Add _CHANGES_LOG column at the end
        html += `<th style="background: #f0f0f0; color: #666;">_CHANGES_LOG</th>`;

        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.duplicateRows.forEach((row, index) => {
            const rowId = `dup-row-${index}`;
            const actionStatus = this.rowActions[row.rowNumber];
            
            // Determine row class based on action status
            let rowClass = '';
            if (actionStatus) {
                if (actionStatus.action === 'delete') rowClass = 'row-deleted';
                else if (actionStatus.action === 'edit') rowClass = 'row-edited';
                else if (actionStatus.action === 'keep') rowClass = 'row-kept';
            }
            
            html += `
                <tr id="${rowId}" class="${rowClass}" data-row-number="${row.rowNumber}">
                    <td class="duplicate-actions-cell">
                        <div class="duplicate-actions" id="actions-${index}">
            `;
            
            // Show appropriate buttons based on action status
            if (actionStatus) {
                const badgeClass = actionStatus.action === 'delete' ? 'badge-delete' : 
                                   actionStatus.action === 'keep' ? 'badge-keep' : 'badge-edit';
                const badgeIcon = actionStatus.action === 'delete' ? '🗑️' : 
                                  actionStatus.action === 'keep' ? '✓' : '✎';
                const badgeLabel = actionStatus.action === 'delete' ? 'Delete' : 
                                   actionStatus.action === 'keep' ? 'Keep' : 'Edited';
                
                html += `
                    <button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Change</button>
                    <span class="${badgeClass}">${badgeIcon} ${badgeLabel}</span>
                `;
            } else {
                html += `
                    <button class="btn-delete-dup" onclick="window.duplicateModal.deleteRow(${index})">Delete</button>
                    <button class="btn-keep-dup" onclick="window.duplicateModal.keepRow(${index})">Keep</button>
                    <button class="btn-edit-dup" onclick="window.duplicateModal.editRow(${index})">Edit</button>
                `;
            }
            
            html += `
                        </div>
                    </td>
                    <td class="duplicate-row-number">${row.rowNumber}</td>
            `;

            // Add all data columns
            this.allColumns.forEach(col => {
                const value = row.data[col.name];
                const isTargetColumn = col.name === this.columnName;
                const cellClass = isTargetColumn ? 'duplicate-value-highlight' : '';
                
                // If this column was edited, show original → new value
                if (isTargetColumn && actionStatus && actionStatus.action === 'edit') {
                    html += `
                        <td>
                            <span class="${cellClass}" data-column="${this.escapeHtml(col.name)}">
                                <span style="text-decoration: line-through; color: #999;">${this.escapeHtml(this.formatValue(actionStatus.originalValue))}</span>
                                <span style="color: #28a745; font-weight: bold;"> → ${this.escapeHtml(actionStatus.newValue)}</span>
                            </span>
                        </td>
                    `;
                } else {
                    html += `
                        <td>
                            <span class="${cellClass}" data-column="${this.escapeHtml(col.name)}">
                                ${this.escapeHtml(this.formatValue(value))}
                            </span>
                        </td>
                    `;
                }
            });

            // Add _CHANGES_LOG column value
            const changesLog = row.data['_CHANGES_LOG'] || '';
            html += `
                <td style="background: #f9f9f9; font-family: monospace; font-size: 0.85em; color: #666;" id="changes-log-${index}">
                    ${this.escapeHtml(changesLog) || '<em>(empty)</em>'}
                </td>
            `;

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    // Show "Change" button + action badge after choosing Delete/Keep/Edit
    showActionChosen(index, action, label) {
        const actionsDiv = document.getElementById(`actions-${index}`);
        const badgeClass = action === 'delete' ? 'badge-delete' : action === 'keep' ? 'badge-keep' : 'badge-edit';
        const badgeIcon = action === 'delete' ? '🗑️' : action === 'keep' ? '✓' : '✎';
        
        actionsDiv.innerHTML = `
            <button class="btn-change" onclick="window.duplicateModal.resetRow(${index})">Change</button>
            <span class="${badgeClass}">${badgeIcon} ${label}</span>
        `;
    }

    // Update the _CHANGES_LOG cell display
    updateChangesLogCell(index, logValue) {
        const cell = document.getElementById(`changes-log-${index}`);
        if (cell) {
            cell.innerHTML = this.escapeHtml(logValue) || '<em>(empty)</em>';
        }
    }

    // Reset row back to initial buttons
    async resetRow(index) {
        const row = this.duplicateRows[index];
        const previousAction = this.rowActions[row.rowNumber];
        
        // Clear the change log entry for this row
        if (previousAction) {
            try {
                await fetch('/api/phase3/clear-change-log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        rowNumber: row.rowNumber,
                        columnName: this.columnName
                    })
                });
                
                // Update local data and display
                row.data['_CHANGES_LOG'] = '';
                this.updateChangesLogCell(index, '');
            } catch (error) {
                console.error('Error clearing change log:', error);
            }
        }
        
        // Clear stored action
        delete this.rowActions[row.rowNumber];
        
        // Restore original buttons
        const actionsDiv = document.getElementById(`actions-${index}`);
        actionsDiv.innerHTML = `
            <button class="btn-delete-dup" onclick="window.duplicateModal.deleteRow(${index})">Delete</button>
            <button class="btn-keep-dup" onclick="window.duplicateModal.keepRow(${index})">Keep</button>
            <button class="btn-edit-dup" onclick="window.duplicateModal.editRow(${index})">Edit</button>
        `;
        
        // Remove row styling
        const rowElement = document.getElementById(`dup-row-${index}`);
        rowElement.classList.remove('row-deleted', 'row-kept', 'row-edited');
        rowElement.style.textDecoration = 'none';
        
        // Restore original value display if it was edited
        if (previousAction && previousAction.action === 'edit' && previousAction.originalValue !== undefined) {
            const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
            if (targetCell) {
                targetCell.innerHTML = `${this.escapeHtml(this.formatValue(previousAction.originalValue))}`;
            }
        }
        
        this.showToast(`Row ${row.rowNumber} reset`);
    }

    // LOG ONLY - Mark row for deletion in _CHANGES_LOG, don't actually delete
    async deleteRow(index) {
        const row = this.duplicateRows[index];

        try {
            // Log the delete action to _CHANGES_LOG column
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

            // Store action locally
            this.rowActions[row.rowNumber] = {
                action: 'delete',
                log: 'Delete entire row'
            };

            // Update local data and display
            const logEntry = `${this.columnName}:DELETE_ROW`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            // Mark row as deleted in UI (visual only - strikethrough)
            const rowElement = document.getElementById(`dup-row-${index}`);
            rowElement.classList.add('row-deleted');

            // Show Change button + Delete badge
            this.showActionChosen(index, 'delete', 'Delete');

            this.showToast(`Row ${row.rowNumber} marked for deletion`);

        } catch (error) {
            console.error('Error logging delete:', error);
            alert('Error marking row for deletion: ' + error.message);
        }
    }

    async editRow(index) {
        const row = this.duplicateRows[index];
        const rowElement = document.getElementById(`dup-row-${index}`);
        
        const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
        if (!targetCell) return;

        const currentValue = row.data[this.columnName];

        targetCell.innerHTML = `
            <input type="text" 
                   class="inline-edit-input" 
                   value="${this.escapeHtml(String(currentValue))}"
                   id="edit-input-${index}"
                   data-original-value="${this.escapeHtml(String(currentValue))}"
                   onkeypress="if(event.key === 'Enter') window.duplicateModal.saveEdit(${index})">
            <div class="inline-edit-actions">
                <button class="btn-save-edit" onclick="window.duplicateModal.saveEdit(${index})">Save</button>
                <button class="btn-cancel-edit" onclick="window.duplicateModal.cancelEdit(${index}, '${this.escapeHtml(String(currentValue))}')">Cancel</button>
            </div>
        `;

        document.getElementById(`edit-input-${index}`).focus();
    }

    // LOG ONLY - Log the edit to _CHANGES_LOG, don't actually update the cell
    async saveEdit(index) {
        const row = this.duplicateRows[index];
        const input = document.getElementById(`edit-input-${index}`);
        const newValue = input.value.trim();
        const originalValue = input.getAttribute('data-original-value');

        if (!newValue) {
            alert('Value cannot be empty');
            return;
        }

        if (newValue === originalValue) {
            this.cancelEdit(index, originalValue);
            return;
        }

        try {
            // Log the edit action to _CHANGES_LOG column
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

            // Store action locally (keep original value for reset)
            this.rowActions[row.rowNumber] = {
                action: 'edit',
                log: 'Edit value',
                originalValue: originalValue,
                newValue: newValue
            };

            // Update local data and display
            const logEntry = `${this.columnName}:${originalValue}→${newValue}`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            // Update display to show new value (visual only)
            const rowElement = document.getElementById(`dup-row-${index}`);
            const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
            targetCell.innerHTML = `
                <span style="text-decoration: line-through; color: #999;">${this.escapeHtml(originalValue)}</span>
                <span style="color: #28a745; font-weight: bold;"> → ${this.escapeHtml(newValue)}</span>
            `;
            
            rowElement.classList.add('row-edited');

            // Show Change button + Edit badge
            this.showActionChosen(index, 'edit', 'Edited');

            this.showToast(`Row ${row.rowNumber} edit logged`);

        } catch (error) {
            console.error('Error logging edit:', error);
            alert('Error logging edit: ' + error.message);
        }
    }

    cancelEdit(index, originalValue) {
        const rowElement = document.getElementById(`dup-row-${index}`);
        const targetCell = rowElement.querySelector(`[data-column="${this.columnName}"]`);
        targetCell.innerHTML = `${this.escapeHtml(originalValue)}`;
    }

    // LOG ONLY - Mark row to keep in _CHANGES_LOG
    async keepRow(index) {
        const row = this.duplicateRows[index];

        try {
            // Log the keep action to _CHANGES_LOG column
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

            // Store action locally
            this.rowActions[row.rowNumber] = {
                action: 'keep',
                log: 'Keep row'
            };

            // Update local data and display
            const logEntry = `${this.columnName}:KEEP`;
            row.data['_CHANGES_LOG'] = logEntry;
            this.updateChangesLogCell(index, logEntry);

            const rowElement = document.getElementById(`dup-row-${index}`);
            rowElement.classList.add('row-kept');

            // Show Change button + Keep badge
            this.showActionChosen(index, 'keep', 'Keep');

            this.showToast(`Row ${row.rowNumber} marked to keep`);

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

        // Pass row actions back to caller so main table can update
        if (this.onClose) {
            this.onClose(this.rowActions, this.duplicateValue);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 11000;
            font-weight: 500;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    formatValue(value) {
        if (value === null || value === undefined) return '(empty)';
        if (value === '') return '(empty)';
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
