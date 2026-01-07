// Edit Value Modal - Universal editor for MANUAL_CHECK_REQUIRED values
// Supports all column types: String, Number, Date, Boolean, Alphanumeric

class EditValueModal {
    constructor() {
        this.overlay = null;
        this.issue = null;
        this.columnName = null;
        this.columnType = null;
        this.subtype = null;
        this.onSave = null;
        this.validationRules = null;
    }

    show(issue, columnName, columnType, subtype, onSave) {
        this.issue = issue;
        this.columnName = columnName;
        this.columnType = columnType;
        this.subtype = subtype;
        this.onSave = onSave;
        this.validationRules = this.getValidationRules();
        this.render();
        this.attachEventListeners();
    }

    getValidationRules() {
        const STRING_SUBTYPES = {
            'serial-number': { name: 'Serial Number', minLength: 1, maxLength: 40, regex: /^[A-Za-z0-9\-_]+$/, description: 'Letters, numbers, hyphens, underscores only. Max 40 chars.' },
            'mac-address': { name: 'MAC Address', minLength: 17, maxLength: 17, regex: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, description: 'Format: XX:XX:XX:XX:XX:XX (hex pairs)' },
            'ip-address-v4': { name: 'IPv4 Address', minLength: 7, maxLength: 15, regex: /^(\d{1,3}\.){3}\d{1,3}$/, validateOctets: true, description: '4 numbers (0-255) separated by dots' },
            'ip-address-v6': { name: 'IPv6 Address', minLength: 3, maxLength: 39, regex: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/, description: 'Valid IPv6 format' },
            'hostname': { name: 'Hostname', minLength: 1, maxLength: 63, regex: /^[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/, description: 'Letters, numbers, hyphens. No spaces.' },
            'asset-tag': { name: 'Asset Tag', minLength: 1, maxLength: 20, regex: /^[A-Za-z0-9\-_]+$/, description: 'Letters, numbers, hyphens, underscores only' },
            'location': { name: 'Location', minLength: 1, maxLength: 100, regex: null, description: 'Any text, max 100 characters' },
            'name': { name: 'Name', minLength: 1, maxLength: 100, regex: null, description: 'Any text, max 100 characters' },
            'model': { name: 'Model', minLength: 1, maxLength: 100, regex: null, description: 'Any text, max 100 characters' },
            'manufacturer': { name: 'Manufacturer', minLength: 1, maxLength: 100, regex: null, description: 'Any text, max 100 characters' },
            'fqdn': { name: 'FQDN', minLength: 5, maxLength: 255, regex: /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$/, description: 'Fully qualified domain name' },
            'uuid': { name: 'UUID/GUID', minLength: 36, maxLength: 36, regex: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, description: 'Format: 8-4-4-4-12 hex characters' },
            'sys-id': { name: 'ServiceNow sys_id', minLength: 32, maxLength: 32, regex: /^[0-9a-fA-F]{32}$/, description: 'Exactly 32 hex characters' },
            'email': { name: 'Email Address', minLength: 5, maxLength: 100, regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, description: 'Valid email format (user@domain.com)' },
            'url': { name: 'URL', minLength: 10, maxLength: 1000, regex: /^https?:\/\/.+/, description: 'Must start with http:// or https://' },
            'phone-number': { name: 'Phone Number', minLength: 8, maxLength: 20, regex: /^\+?[0-9\s\-\(\)]+$/, description: 'Digits, +, -, (, ), spaces only' },
            'short-description': { name: 'Short Description', minLength: 1, maxLength: 160, regex: /^[^\n\r]*$/, description: 'Single line, max 160 characters' },
            'description': { name: 'Description', minLength: 1, maxLength: 4000, regex: null, description: 'Any text, max 4000 characters' }
        };

        const NUMBER_SUBTYPES = {
            'integer': { name: 'Integer', min: -2147483647, max: 2147483647, decimals: 0, description: 'Whole number' },
            'positive-integer': { name: 'Positive Integer', min: 0, max: 2147483647, decimals: 0, description: 'Whole number >= 0' },
            'port-number': { name: 'Port Number', min: 0, max: 65535, decimals: 0, description: '0 to 65535' },
            'percentage': { name: 'Percentage', min: 0, max: 100, decimals: 2, description: '0 to 100, up to 2 decimals' },
            'currency': { name: 'Currency', min: null, max: null, decimals: 2, description: 'Exactly 2 decimal places' },
            'decimal': { name: 'Decimal', min: null, max: null, decimals: 2, description: 'Up to 2 decimal places' },
            'memory-mb': { name: 'Memory (MB)', min: 0, max: 16777216, decimals: 0, description: 'Whole number, 0 to 16,777,216' },
            'memory-gb': { name: 'Memory (GB)', min: 0, max: 16384, decimals: 1, description: '0 to 16,384, up to 1 decimal' },
            'cpu-count': { name: 'CPU Count', min: 1, max: 1024, decimals: 0, description: 'Whole number, 1 to 1024' },
            'disk-gb': { name: 'Disk Size (GB)', min: 0, max: 1048576, decimals: 0, description: 'Whole number, 0 to 1,048,576' }
        };

        const DATE_SUBTYPES = {
            'date-only': { name: 'Date Only', format: 'YYYY-MM-DD', regex: /^\d{4}-\d{2}-\d{2}$/, description: 'Format: YYYY-MM-DD (e.g., 2025-01-05)' },
            'datetime': { name: 'DateTime', format: 'YYYY-MM-DD HH:mm:ss', regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, description: 'Format: YYYY-MM-DD HH:mm:ss' },
            'time-only': { name: 'Time Only', format: 'HH:mm:ss', regex: /^\d{2}:\d{2}:\d{2}$/, description: 'Format: HH:mm:ss (e.g., 14:30:00)' },
            'servicenow-datetime': { name: 'ServiceNow DateTime', format: 'YYYY-MM-DD HH:mm:ss', regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, description: 'Format: YYYY-MM-DD HH:mm:ss' }
        };

        const BOOLEAN_SUBTYPES = {
            'standard': { name: 'Boolean (true/false)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], description: 'true or false' },
            'yes-no': { name: 'Boolean (Yes/No)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], description: 'Yes or No' },
            'one-zero': { name: 'Boolean (1/0)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], description: '1 or 0' }
        };

        if (this.subtype) {
            if (STRING_SUBTYPES[this.subtype]) return { type: 'string', ...STRING_SUBTYPES[this.subtype] };
            if (NUMBER_SUBTYPES[this.subtype]) return { type: 'number', ...NUMBER_SUBTYPES[this.subtype] };
            if (DATE_SUBTYPES[this.subtype]) return { type: 'date', ...DATE_SUBTYPES[this.subtype] };
            if (BOOLEAN_SUBTYPES[this.subtype]) return { type: 'boolean', ...BOOLEAN_SUBTYPES[this.subtype] };
        }
        return { type: this.columnType, name: this.columnType ? this.columnType.charAt(0).toUpperCase() + this.columnType.slice(1) : 'Value', description: `Valid ${this.columnType || 'text'} value` };
    }

    validateValue(value) {
        if (value === null || value === undefined || value === '') {
            return { valid: false, message: 'Value cannot be empty' };
        }
        const rules = this.validationRules;
        if (!rules) return { valid: true, message: 'Value accepted' };

        if (rules.type === 'string' || this.columnType === 'string' || this.columnType === 'alphanumeric') {
            const strValue = String(value);
            if (rules.minLength && strValue.length < rules.minLength) return { valid: false, message: `Too short. Minimum ${rules.minLength} characters. Current: ${strValue.length}` };
            if (rules.maxLength && strValue.length > rules.maxLength) return { valid: false, message: `Too long. Maximum ${rules.maxLength} characters. Current: ${strValue.length}` };
            if (rules.regex && !rules.regex.test(strValue)) return { valid: false, message: `Invalid format. ${rules.description || ''}` };
            if (this.subtype === 'ip-address-v4' && rules.validateOctets) {
                const octets = strValue.split('.');
                for (const octet of octets) {
                    const num = parseInt(octet, 10);
                    if (num < 0 || num > 255) return { valid: false, message: `Invalid octet "${octet}". Each must be 0-255.` };
                }
            }
            return { valid: true, message: '✓ Valid format' };
        }

        if (rules.type === 'number' || this.columnType === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return { valid: false, message: 'Value must be a valid number' };
            if (rules.decimals === 0 && !Number.isInteger(numValue)) return { valid: false, message: 'Value must be a whole number (no decimals)' };
            if (rules.decimals !== null && rules.decimals !== undefined) {
                const decimalPlaces = (value.toString().split('.')[1] || '').length;
                if (decimalPlaces > rules.decimals) return { valid: false, message: `Too many decimal places. Maximum ${rules.decimals} allowed.` };
            }
            if (rules.min !== null && rules.min !== undefined && numValue < rules.min) return { valid: false, message: `Value too small. Minimum is ${rules.min}.` };
            if (rules.max !== null && rules.max !== undefined && numValue > rules.max) return { valid: false, message: `Value too large. Maximum is ${rules.max}.` };
            return { valid: true, message: '✓ Valid number' };
        }

        if (rules.type === 'date' || this.columnType === 'date') {
            if (rules.regex && !rules.regex.test(String(value))) return { valid: false, message: `Invalid format. Expected: ${rules.format}` };
            const date = new Date(value);
            if (isNaN(date.getTime())) return { valid: false, message: 'Invalid date value' };
            return { valid: true, message: '✓ Valid date' };
        }

        if (rules.type === 'boolean' || this.columnType === 'boolean') {
            const lowerValue = String(value).toLowerCase().trim();
            if (rules.trueValues && rules.falseValues) {
                if (rules.trueValues.includes(lowerValue) || rules.falseValues.includes(lowerValue)) return { valid: true, message: '✓ Valid boolean' };
                return { valid: false, message: `Invalid. Accepted: ${rules.trueValues.join(', ')}, ${rules.falseValues.join(', ')}` };
            }
            return { valid: true, message: '✓ Valid value' };
        }
        return { valid: true, message: '✓ Value accepted' };
    }

    render() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'edit-value-modal-overlay';
        const rules = this.validationRules;
        const rulesHtml = this.buildFormatRulesHtml(rules);

        this.overlay.innerHTML = `
            <div class="edit-value-modal">
                <div class="edit-value-modal-header">
                    <h2>✏️ Edit Value - Row ${this.issue.rowNumber}</h2>
                    <div class="modal-subtitle">Column: ${this.escapeHtml(this.columnName)}</div>
                    <div class="type-badges">
                        <span class="type-badge">${this.escapeHtml((this.columnType || 'text').toUpperCase())}</span>
                        ${this.subtype ? `<span class="type-badge">${this.escapeHtml(rules.name || this.subtype.toUpperCase())}</span>` : ''}
                    </div>
                </div>
                <div class="edit-value-modal-body">
                    <div class="validation-error-section">
                        <h4>❌ Validation Error</h4>
                        <p>${this.escapeHtml(this.issue.reason || 'Manual review required')}</p>
                    </div>
                    ${rulesHtml}
                    <div class="current-value-section">
                        <label>Current Value:</label>
                        <div class="current-value-display">${this.escapeHtml(String(this.issue.currentValue || '(empty)'))}</div>
                    </div>
                    <div class="new-value-section">
                        <label for="new-value-input">New Value:</label>
                        <input type="text" id="new-value-input" class="new-value-input" value="${this.escapeHtml(String(this.issue.currentValue || ''))}" placeholder="Enter new value..." autocomplete="off">
                        <div id="validation-feedback" class="validation-feedback empty"><span class="feedback-icon">💡</span><span>Type a new value to validate</span></div>
                    </div>
                    <div id="preview-section" class="preview-section" style="display: none;">
                        <h4>📝 Preview Change</h4>
                        <div class="preview-change"><span class="preview-old" id="preview-old"></span><span class="preview-arrow">→</span><span class="preview-new" id="preview-new"></span></div>
                    </div>
                </div>
                <div class="edit-value-modal-footer">
                    <button class="btn-cancel-edit-modal" id="btn-cancel">Cancel</button>
                    <button class="btn-save-edit-modal" id="btn-save" disabled>💾 Save</button>
                </div>
            </div>`;
        document.body.appendChild(this.overlay);
        setTimeout(() => { const input = document.getElementById('new-value-input'); if (input) { input.focus(); input.select(); } }, 100);
    }

    buildFormatRulesHtml(rules) {
        if (!rules) return '';
        const rulesList = [];
        if (rules.description) rulesList.push(rules.description);
        if (rules.minLength !== undefined && rules.maxLength !== undefined) {
            rulesList.push(rules.minLength === rules.maxLength ? `Exactly ${rules.minLength} characters` : `Length: ${rules.minLength} - ${rules.maxLength} characters`);
        }
        if (rules.min !== undefined && rules.min !== null && rules.max !== undefined && rules.max !== null) rulesList.push(`Range: ${rules.min.toLocaleString()} to ${rules.max.toLocaleString()}`);
        if (rules.decimals !== undefined && rules.decimals !== null) rulesList.push(`Decimal places: ${rules.decimals === 0 ? 'None (whole number)' : `Up to ${rules.decimals}`}`);
        if (rules.format) rulesList.push(`Format: ${rules.format}`);
        if (rulesList.length === 0) return '';
        return `<div class="format-rules-section"><h4>📋 Format Rules</h4><ul>${rulesList.map(rule => `<li>${this.escapeHtml(rule)}</li>`).join('')}</ul></div>`;
    }

    attachEventListeners() {
        const input = document.getElementById('new-value-input');
        const btnCancel = document.getElementById('btn-cancel');
        const btnSave = document.getElementById('btn-save');
        input.addEventListener('input', () => this.onInputChange());
        btnCancel.addEventListener('click', () => this.close());
        btnSave.addEventListener('click', () => this.save());
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !btnSave.disabled) this.save(); });
        document.addEventListener('keydown', this.escapeHandler = (e) => { if (e.key === 'Escape') this.close(); });
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
        this.onInputChange();
    }

    onInputChange() {
        const input = document.getElementById('new-value-input');
        const feedback = document.getElementById('validation-feedback');
        const btnSave = document.getElementById('btn-save');
        const previewSection = document.getElementById('preview-section');
        const previewOld = document.getElementById('preview-old');
        const previewNew = document.getElementById('preview-new');
        const newValue = input.value;
        const originalValue = String(this.issue.currentValue || '');
        const result = this.validateValue(newValue);
        input.classList.remove('is-valid', 'is-invalid');
        feedback.classList.remove('valid', 'invalid', 'empty');
        if (newValue === '') {
            feedback.classList.add('empty');
            feedback.innerHTML = `<span class="feedback-icon">💡</span><span>Enter a value to validate</span>`;
            btnSave.disabled = true;
            previewSection.style.display = 'none';
        } else if (result.valid) {
            input.classList.add('is-valid');
            feedback.classList.add('valid');
            feedback.innerHTML = `<span class="feedback-icon">✅</span><span>${this.escapeHtml(result.message)}</span>`;
            if (newValue !== originalValue) {
                btnSave.disabled = false;
                previewSection.style.display = 'block';
                previewOld.textContent = originalValue || '(empty)';
                previewNew.textContent = newValue;
            } else {
                btnSave.disabled = true;
                previewSection.style.display = 'none';
            }
        } else {
            input.classList.add('is-invalid');
            feedback.classList.add('invalid');
            feedback.innerHTML = `<span class="feedback-icon">❌</span><span>${this.escapeHtml(result.message)}</span>`;
            btnSave.disabled = true;
            previewSection.style.display = 'none';
        }
    }

    async save() {
        const input = document.getElementById('new-value-input');
        const newValue = input.value;
        const result = this.validateValue(newValue);
        if (!result.valid) { this.showToast('❌ Invalid value. Please fix errors before saving.', 'error'); return; }
        if (this.onSave) {
            try {
                await this.onSave(newValue);
                this.showToast('✓ Value updated successfully', 'success');
                this.close();
            } catch (error) { this.showToast('❌ Error saving: ' + error.message, 'error'); }
        } else this.close();
    }

    close() {
        if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler);
        if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 11000; font-weight: 500; background: ${type === 'success' ? '#28a745' : '#dc3545'}; color: white;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.transition = 'opacity 0.3s'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
    }

    escapeHtml(text) { if (text === null || text === undefined) return ''; const div = document.createElement('div'); div.textContent = String(text); return div.innerHTML; }
}

window.editValueModal = new EditValueModal();
