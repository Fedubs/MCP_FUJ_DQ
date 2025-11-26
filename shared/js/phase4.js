// Phase 4: Export Clean Data - WITH CHANGE LOG COLUMN
// ✅ UPDATED: Fixed color logic - Row number cell now green for KEEP rows
const Phase4 = {
    allData: [],
    headers: [],
    trackedDecisions: [],
    deletionCount: 0,
    changesMap: {},
    isEditing: false,

    async init() {
        console.log('Phase 4 initialized');
        await this.loadChanges();
        this.setupEventDelegation();
    },
    
    setupEventDelegation() {
        const tbody = document.getElementById('reviewTableBody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const cell = e.target.closest('.editable-cell');
                if (cell && !this.isEditing) {
                    const rowNumber = parseInt(cell.dataset.row);
                    const columnName = cell.dataset.column;
                    this.editCell(rowNumber, columnName, cell);
                }
            });
        }
    },
    
    async loadChanges() {
        try {
            const response = await fetch('/api/phase4/get-changes');
            const data = await response.json();
            
            if (data.success) {
                this.allData = data.allData || [];
                this.headers = data.headers || [];
                this.trackedDecisions = data.trackedDecisions || [];
                this.deletionCount = data.deletionCount || 0;
                
                this.changesMap = {};
                this.allData.forEach(rowData => {
                    this.changesMap[rowData.rowNumber] = rowData.cells;
                });
                
                this.renderSpreadsheetView();
                this.updateSummary();
            } else {
                this.showEmptyState();
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showEmptyState();
        }
    },
    
    // ✅ Helper to determine action type from raw action string
    getActionType(action) {
        if (!action || action === 'unchanged') return 'unchanged';
        if (action === 'KEEP') return 'kept';
        if (action === 'DELETE_ROW') return 'deleted';
        if (action.includes('→')) return 'edited'; // e.g. "DT004→DT004f"
        if (action === 'kept' || action === 'changed' || action === 'rejected' || action === 'deleted') return action;
        return 'changed'; // default
    },
    
    // Generate change log text for a row
    getChangeLog(rowData) {
        const changes = [];
        
        // Check if row is marked for deletion
        if (rowData.markedForDeletion) {
            return `🗑️ DELETE ROW (${rowData.deletionReason || 'DUPLICATE'})`;
        }
        
        // Check each cell for changes
        Object.entries(rowData.cells).forEach(([colName, cell]) => {
            const actionType = this.getActionType(cell.action);
            
            if (actionType === 'edited') {
                changes.push(`✎ ${colName}: ${cell.action}`); // Show original→new
            } else if (actionType === 'kept') {
                changes.push(`✓ ${colName}: KEEP`);
            } else if (actionType === 'deleted') {
                changes.push(`🗑️ ${colName}: DELETE`);
            } else if (actionType === 'changed') {
                changes.push(`✎ ${colName}: changed`);
            } else if (actionType === 'rejected') {
                changes.push(`✗ ${colName}: rejected`);
            }
        });
        
        if (changes.length === 0) {
            return '—';
        }
        
        return changes.join(', ');
    },
    
    renderSpreadsheetView() {
        const container = document.getElementById('reviewTableBody');
        
        if (this.allData.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="20" style="text-align: center; padding: 3rem; color: #888;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <p style="font-size: 1.2rem;">No data to review</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Build table header WITH Change Log column
        const thead = document.querySelector('#reviewTable thead');
        thead.innerHTML = `
            <tr>
                <th style="position: sticky; left: 0; background: var(--sn-secondary); z-index: 11;">Row</th>
                <th style="background: #e3f2fd; min-width: 200px;">📋 Change Log</th>
                ${this.headers.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}
            </tr>
        `;
        
        // Build table rows WITH Change Log column
        container.innerHTML = this.allData.map(rowData => {
            const rowNum = rowData.rowNumber;
            const cells = rowData.cells;
            const isMarkedForDeletion = rowData.markedForDeletion || false;
            const hasChanges = Object.values(cells).some(cell => {
                const actionType = this.getActionType(cell.action);
                return actionType !== 'unchanged';
            });
            
            // ✅ Check specific action types for styling
            const hasKeep = Object.values(cells).some(c => this.getActionType(c.action) === 'kept');
            const hasEdit = Object.values(cells).some(c => this.getActionType(c.action) === 'edited' || this.getActionType(c.action) === 'changed');
            
            const rowClasses = [];
            if (isMarkedForDeletion) {
                rowClasses.push('row-delete');
            } else if (hasChanges) {
                rowClasses.push('row-has-changes');
            }
            
            // Get change log for this row
            const changeLog = this.getChangeLog(rowData);
            
            // ✅ FIXED: Row number cell background based on action type
            let rowNumBg = 'white';
            if (isMarkedForDeletion) {
                rowNumBg = '#ffebee'; // Red
            } else if (hasKeep && !hasEdit) {
                rowNumBg = '#d4edda'; // Green for KEEP only
            } else if (hasEdit) {
                rowNumBg = '#fff3cd'; // Yellow for edits
            }
            
            // Determine Change Log cell style
            let changeLogStyle = 'background: #f5f5f5; color: #999;'; // default (no changes)
            if (isMarkedForDeletion) {
                changeLogStyle = 'background: #ffcdd2; color: #c62828; font-weight: bold;';
            } else if (hasKeep && !hasEdit) {
                changeLogStyle = 'background: #c8e6c9; color: #2e7d32; font-weight: bold;'; // Green for KEEP
            } else if (hasEdit) {
                changeLogStyle = 'background: #fff9c4; color: #6d4c00;'; // Yellow for edits
            }
            
            return `
                <tr class="${rowClasses.join(' ')}">
                    <td class="row-number" style="position: sticky; left: 0; background: ${rowNumBg}; font-weight: 600; z-index: 10;">
                        ${rowNum}
                    </td>
                    <td style="${changeLogStyle} padding: 0.5rem; font-size: 0.85em;">
                        ${changeLog}
                    </td>
                    ${this.headers.map(colName => {
                        const cell = cells[colName];
                        if (!cell) {
                            return '<td style="color: #ccc; background: white;">—</td>';
                        }
                        
                        const actionType = this.getActionType(cell.action);
                        
                        let cellStyle = 'background: white;';
                        let cellClass = isMarkedForDeletion ? '' : 'editable-cell';
                        let indicator = '';
                        
                        // ✅ Color based on action type
                        if (actionType === 'edited' || actionType === 'changed') {
                            cellStyle = 'background-color: #fff3cd;'; // Yellow
                            cellClass += ' cell-changed';
                            indicator = '<span class="change-indicator" style="color: #856404; font-size: 0.8em;">✎</span>';
                        } else if (actionType === 'rejected') {
                            cellStyle = 'background-color: #f8d7da;'; // Light red
                            cellClass += ' cell-rejected';
                            indicator = '<span class="change-indicator" style="color: #721c24; font-size: 0.8em;">✗</span>';
                        } else if (actionType === 'kept') {
                            cellStyle = 'background-color: #d4edda;'; // Green
                            cellClass += ' cell-kept';
                            indicator = '<span class="change-indicator" style="color: #155724; font-size: 0.8em;">✓</span>';
                        } else if (actionType === 'deleted') {
                            cellStyle = 'background-color: #ffcdd2;'; // Red
                            cellClass += ' cell-deleted';
                            indicator = '<span class="change-indicator" style="color: #c62828; font-size: 0.8em;">🗑️</span>';
                        } else if (cell.manuallyEdited) {
                            cellStyle = 'background-color: #d1ecf1;'; // Blue
                            cellClass += ' cell-edited';
                            indicator = '<span class="change-indicator" style="color: #0c5460; font-size: 0.8em;">✓</span>';
                        }
                        
                        const displayValue = cell.currentValue === '' ? 
                            '<em style="color: #999;">(empty)</em>' : 
                            this.escapeHtml(cell.currentValue);
                        
                        const tooltip = actionType !== 'unchanged' ? 
                            `Original: ${cell.originalValue}\nAction: ${cell.action}` : 
                            'No changes made';
                        
                        const cursorStyle = isMarkedForDeletion ? 'not-allowed' : 'pointer';
                        
                        return `
                            <td class="${cellClass}" 
                                style="${cellStyle} cursor: ${cursorStyle}; padding: 0.5rem;" 
                                title="${tooltip}"
                                data-row="${rowNum}"
                                data-column="${this.escapeHtml(colName)}"
                                data-value="${this.escapeHtml(cell.currentValue)}">
                                <div class="cell-content" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${displayValue}</span>
                                    ${indicator}
                                </div>
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        }).join('');
    },
    
    editCell(rowNumber, columnName, cellElement) {
        if (this.isEditing) return;
        
        const rowData = this.allData.find(r => r.rowNumber === rowNumber);
        if (rowData && rowData.markedForDeletion) {
            this.showToast('⚠️ Cannot edit rows marked for deletion');
            return;
        }
        
        this.isEditing = true;
        
        const currentValue = cellElement.dataset.value || '';
        const originalHTML = cellElement.innerHTML;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';
        input.style.cssText = 'width: 100%; padding: 0.25rem; border: 2px solid #007bff; border-radius: 3px;';
        
        cellElement.textContent = '';
        cellElement.appendChild(input);
        input.focus();
        input.select();
        
        const saveEdit = async () => {
            const newValue = input.value.trim();
            if (newValue !== currentValue) {
                await this.updateCellValue(rowNumber, columnName, newValue);
            } else {
                cellElement.innerHTML = originalHTML;
                this.isEditing = false;
            }
        };
        
        const cancelEdit = () => {
            cellElement.innerHTML = originalHTML;
            this.isEditing = false;
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(saveEdit, 100);
        });
    },
    
    async updateCellValue(rowNumber, columnName, newValue) {
        try {
            const response = await fetch('/api/phase4/update-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowNumber, columnName, newValue })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (this.changesMap[rowNumber] && this.changesMap[rowNumber][columnName]) {
                    this.changesMap[rowNumber][columnName].currentValue = newValue;
                    this.changesMap[rowNumber][columnName].manuallyEdited = true;
                }
                
                this.isEditing = false;
                this.renderSpreadsheetView();
                this.showToast(`✓ Updated Row ${rowNumber}, Column "${columnName}"`);
            } else {
                this.isEditing = false;
                this.renderSpreadsheetView();
                this.showToast('❌ Error updating cell: ' + data.error);
            }
            
        } catch (error) {
            this.isEditing = false;
            this.renderSpreadsheetView();
            this.showToast('❌ Error: ' + error.message);
        }
    },
    
    updateSummary() {
        // ✅ Count based on action types
        let keptCount = 0;
        let changedCount = 0;
        let deletedCount = 0;
        let rejectedCount = 0;
        
        this.trackedDecisions.forEach(c => {
            const actionType = this.getActionType(c.action);
            if (actionType === 'kept') keptCount++;
            else if (actionType === 'edited' || actionType === 'changed') changedCount++;
            else if (actionType === 'deleted') deletedCount++;
            else if (actionType === 'rejected') rejectedCount++;
        });
        
        document.getElementById('totalChanges').textContent = this.trackedDecisions.length;
        document.getElementById('changedCount').textContent = changedCount;
        document.getElementById('rejectedCount').textContent = rejectedCount;
        document.getElementById('keptCount').textContent = keptCount;
        document.getElementById('deletedCount').textContent = this.deletionCount;
    },
    
    filterChanges() {
        const searchText = document.getElementById('searchChanges').value.toLowerCase();
        const actionFilter = document.getElementById('filterAction').value;
    },
    
    closeReviewPanel() {
        const reviewPanel = document.getElementById('reviewPanel');
        const exportSection = document.getElementById('exportSection');
        
        reviewPanel.style.maxHeight = reviewPanel.offsetHeight + 'px';
        setTimeout(() => {
            reviewPanel.style.maxHeight = '0';
            reviewPanel.style.opacity = '0';
            reviewPanel.style.marginBottom = '0';
        }, 10);
        setTimeout(() => {
            reviewPanel.style.display = 'none';
            exportSection.style.display = 'block';
            exportSection.style.opacity = '0';
            setTimeout(() => {
                exportSection.style.transition = 'opacity 0.3s';
                exportSection.style.opacity = '1';
            }, 10);
        }, 500);
    },
    
    showReviewPanel() {
        const reviewPanel = document.getElementById('reviewPanel');
        const exportSection = document.getElementById('exportSection');
        
        exportSection.style.opacity = '0';
        setTimeout(() => {
            exportSection.style.display = 'none';
            reviewPanel.style.display = 'block';
            reviewPanel.style.maxHeight = 'none';
            reviewPanel.style.opacity = '0';
            setTimeout(() => {
                reviewPanel.style.transition = 'opacity 0.3s';
                reviewPanel.style.opacity = '1';
            }, 10);
        }, 300);
    },
    
    showEmptyState() {
        const tbody = document.getElementById('reviewTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="20" style="text-align: center; padding: 3rem; color: #888;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <p style="font-size: 1.2rem;">No changes were made during Phase 3</p>
                </td>
            </tr>
        `;
        
        document.getElementById('totalChanges').textContent = '0';
        document.getElementById('changedCount').textContent = '0';
        document.getElementById('rejectedCount').textContent = '0';
        document.getElementById('keptCount').textContent = '0';
        document.getElementById('deletedCount').textContent = '0';
    },
    
    async exportFile() {
        try {
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<div class="loading-spinner" style="display: inline-block;"></div> Preparing...';
            button.disabled = true;
            
            const response = await fetch('/api/phase4/export', { method: 'POST' });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cleaned_data.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            button.innerHTML = originalText;
            button.disabled = false;
            this.showToast('✅ File downloaded!');
            
        } catch (error) {
            this.showToast('❌ Error exporting file');
            const button = event.target;
            button.innerHTML = '📥 Download Cleaned File';
            button.disabled = false;
        }
    },
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 2rem; right: 2rem; background: #333; color: white;
            padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 10000; opacity: 1; transition: opacity 0.3s;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Phase4.init());
} else {
    Phase4.init();
}
