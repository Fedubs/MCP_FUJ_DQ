// ServiceNow Reference Validation Modal
class ReferenceModal {
    constructor() {
        this.overlay = null;
        this.excelValue = null;
        this.rowNumber = null;
        this.columnName = null;
        this.similarMatches = [];
        this.reason = null;
        this.onClose = null;
        this.isValid = false;
        this.showManualEntry = false; // Track if showing manual entry for valid values
    }

    show(issue, columnName, onClose) {
        this.excelValue = issue.currentValue;
        this.rowNumber = issue.rowNumber;
        this.columnName = columnName;
        this.reason = issue.reason;
        this.onClose = onClose;
        this.showManualEntry = false;

        // Check if this is a VALID value
        this.isValid = (
            this.reason && this.reason.toLowerCase().includes('found in servicenow')
        );

        // Parse similar matches from reason
        this.parseSimilarMatches();

        // Create and show modal
        this.render();
    }

    parseSimilarMatches() {
        // Extract similar matches from reason like: "Not in ServiceNow. Similar: Sydney, Sidney"
        if (this.reason && this.reason.includes('Similar:')) {
            const matches = this.reason.split('Similar:')[1].trim();
            this.similarMatches = matches.split(',').map(m => m.trim());
        } else {
            this.similarMatches = [];
        }
    }

    render() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'reference-modal-overlay';

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'reference-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'reference-modal-header';
        header.innerHTML = `
            <h2>🔍 ServiceNow Reference Validation</h2>
            <div class="subtitle">
                Column: <strong>${this.escapeHtml(this.columnName)}</strong> | 
                Row: <strong>${this.rowNumber}</strong>
            </div>
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'reference-modal-body';
        body.innerHTML = this.renderComparison();

        // Footer
        const footer = document.createElement('div');
        footer.className = 'reference-modal-footer';
        
        if (this.isValid && !this.showManualEntry) {
            // For valid values, show 3 action buttons
            footer.innerHTML = `
                <button class="btn btn-success" onclick="window.referenceModal.keepValue()">
                    ✓ Keep as Valid
                </button>
                <button class="btn btn-danger" onclick="window.referenceModal.rejectValue()">
                    ✗ Reject Value
                </button>
                <button class="btn btn-warning" onclick="window.referenceModal.showMatchOptions()">
                    🔍 Select Different Match
                </button>
            `;
        } else {
            // For invalid values or when showing match options
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.referenceModal.close()">
                    Close Without Changing
                </button>
            `;
        }

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Close on ESC key
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.escHandler);
    }

    renderComparison() {
        // VALID VALUE - Show success message with actions
        if (this.isValid && !this.showManualEntry) {
            return `
                <div class="reference-comparison-container" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 2rem;">
                    <div style="font-size: 4rem; color: #28a745; margin-bottom: 1rem;">✓</div>
                    <h2 style="color: #28a745; margin-bottom: 1rem;">Value is Valid!</h2>
                    <div class="reference-value-card success-card" style="max-width: 500px; margin-bottom: 1.5rem;">
                        <div class="reference-value-text" style="font-size: 1.5rem;">${this.escapeHtml(this.excelValue)}</div>
                        <div class="reference-value-meta">Row ${this.rowNumber}</div>
                    </div>
                    <div class="reference-info-box" style="max-width: 600px;">
                        <strong>✓ Found in ServiceNow:</strong> This value exists in the ServiceNow CMDB.
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #c3e6cb;">
                            <strong>Choose an action:</strong>
                            <ul style="text-align: left; margin-top: 0.5rem;">
                                <li><strong>Keep as Valid</strong> - Value is correct, no changes needed</li>
                                <li><strong>Reject Value</strong> - Mark this value as empty/invalid</li>
                                <li><strong>Select Different Match</strong> - Choose a different ServiceNow value</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // INVALID VALUE OR SHOWING MATCH OPTIONS - Show error and suggestions
        let html = `
            <div class="reference-comparison-container">
                <!-- Current Excel Value -->
                <div class="reference-section excel-value-section">
                    <h3 class="reference-section-title">
                        <span class="status-icon ${this.isValid ? 'status-success' : 'status-error'}">${this.isValid ? '✓' : '❌'}</span>
                        Current Value in Excel
                    </h3>
                    <div class="reference-value-card ${this.isValid ? 'success-card' : 'error-card'}">
                        <div class="reference-value-text">${this.escapeHtml(this.excelValue)}</div>
                        <div class="reference-value-meta">Row ${this.rowNumber}</div>
                        <div class="reference-value-status">
                            ${this.isValid ? '✓ Found in ServiceNow' : '⚠️ Not found in ServiceNow'}
                        </div>
                    </div>
                </div>

                <!-- Arrow -->
                <div class="reference-arrow">
                    <div class="arrow-icon">→</div>
                    <div class="arrow-label">Replace with</div>
                </div>

                <!-- ServiceNow Matches -->
                <div class="reference-section servicenow-section">
                    <h3 class="reference-section-title">
                        <span class="status-icon status-success">✓</span>
                        ${this.isValid ? 'Other Valid Values in ServiceNow' : 'Valid Values in ServiceNow'}
                    </h3>
        `;

        if (this.similarMatches.length > 0) {
            // Show similar matches as selectable cards
            this.similarMatches.forEach((match, index) => {
                html += `
                    <div class="reference-value-card success-card clickable" 
                         onclick="window.referenceModal.selectMatch('${this.escapeHtml(match)}')">
                        <div class="reference-value-text">${this.escapeHtml(match)}</div>
                        <div class="reference-value-meta">Click to use this value</div>
                        <button class="btn-select-match">
                            Use "${this.escapeHtml(match)}"
                        </button>
                    </div>
                `;
            });

            html += `
                <div class="reference-info-box">
                    <strong>💡 Tip:</strong> These values were found in ServiceNow ${this.isValid ? '' : 'and are similar to your Excel value'}.
                </div>
            `;
        } else {
            // No matches found - need to fetch all ServiceNow values
            html += `
                <div class="reference-value-card warning-card">
                    <div class="reference-value-text">Loading ServiceNow values...</div>
                    <div class="reference-value-meta">Fetching all available options</div>
                </div>
                <div class="reference-info-box warning">
                    <strong>💡 Note:</strong> No similar matches were pre-loaded. Enter a custom value below or close to search ServiceNow manually.
                </div>
            `;
        }

        html += `
                    <!-- Manual Entry Option -->
                    <div class="reference-manual-entry">
                        <h4>Or enter a different value:</h4>
                        <div class="manual-entry-controls">
                            <input type="text" 
                                   id="manual-entry-input" 
                                   class="form-input" 
                                   placeholder="Type a custom value..."
                                   onkeypress="if(event.key === 'Enter') window.referenceModal.selectCustomValue()">
                            <button class="btn btn-secondary" onclick="window.referenceModal.selectCustomValue()">
                                Use Custom Value
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    // NEW: Keep the valid value as-is
    keepValue() {
        this.showToast(`Row ${this.rowNumber}: Value "${this.excelValue}" kept as valid`);
        setTimeout(() => {
            this.close(this.excelValue); // Pass the kept value back
        }, 800);
    }

    // NEW: Reject the value (set to empty or REJECTED)
    async rejectValue() {
        if (!confirm(`Mark "${this.excelValue}" as invalid/rejected?`)) {
            return;
        }

        await this.updateValue(''); // Set to empty
    }

    // NEW: Show match options for valid values
    showMatchOptions() {
        this.showManualEntry = true;
        
        // Re-render the modal to show match options
        const body = document.querySelector('.reference-modal-body');
        const footer = document.querySelector('.reference-modal-footer');
        
        if (body) body.innerHTML = this.renderComparison();
        if (footer) {
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.referenceModal.goBackToValid()">
                    ← Back
                </button>
                <button class="btn btn-secondary" onclick="window.referenceModal.close()">
                    Close Without Changing
                </button>
            `;
        }
    }

    // NEW: Go back to valid value view
    goBackToValid() {
        this.showManualEntry = false;
        
        const body = document.querySelector('.reference-modal-body');
        const footer = document.querySelector('.reference-modal-footer');
        
        if (body) body.innerHTML = this.renderComparison();
        if (footer) {
            footer.innerHTML = `
                <button class="btn btn-success" onclick="window.referenceModal.keepValue()">
                    ✓ Keep as Valid
                </button>
                <button class="btn btn-danger" onclick="window.referenceModal.rejectValue()">
                    ✗ Reject Value
                </button>
                <button class="btn btn-warning" onclick="window.referenceModal.showMatchOptions()">
                    🔍 Select Different Match
                </button>
            `;
        }
    }

    async selectMatch(matchValue) {
        if (!confirm(`Replace "${this.excelValue}" with "${matchValue}"?`)) {
            return;
        }

        await this.updateValue(matchValue);
    }

    async selectCustomValue() {
        const input = document.getElementById('manual-entry-input');
        const customValue = input.value.trim();

        if (!customValue) {
            alert('Please enter a value');
            return;
        }

        if (!confirm(`Replace "${this.excelValue}" with "${customValue}"?`)) {
            return;
        }

        await this.updateValue(customValue);
    }

    async updateValue(newValue) {
        try {
            const response = await fetch('/api/phase3/update-cell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: this.rowNumber,
                    columnName: this.columnName,
                    newValue: newValue
                })
            });

            if (!response.ok) throw new Error('Failed to update value');

            console.log(`✓ Updated row ${this.rowNumber}, column ${this.columnName} to: ${newValue}`);

            const message = newValue === '' ? 
                `Row ${this.rowNumber} value rejected (set to empty)` :
                `Row ${this.rowNumber} updated to "${newValue}"`;
            
            this.showToast(message);

            // Close modal and pass the new value back to the callback
            setTimeout(() => {
                this.close(newValue); // ✅ NOW PASSING THE VALUE BACK!
            }, 1000);

        } catch (error) {
            console.error('Error updating cell:', error);
            alert('Error updating value: ' + error.message);
        }
    }

    close(newValue = null) {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        // Remove ESC key handler
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
        }

        // ✅ Pass the new value back to the callback
        if (this.onClose) {
            this.onClose(newValue);
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

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

// Initialize global instance
window.referenceModal = new ReferenceModal();
