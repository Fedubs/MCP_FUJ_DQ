// Phase 2: Analysis Logic

console.log('[Phase2] Script loaded at:', new Date().toISOString());

const Phase2 = {
    columns: [],
    fileData: null,
    configuration: {
        name: '',
        columnSettings: []
    },
    
    // Common ServiceNow CMDB tables
    snowTables: [
        { value: 'cmdb_ci', label: 'Configuration Item (cmdb_ci)' },
        { value: 'cmdb_ci_hardware', label: 'Hardware (cmdb_ci_hardware)' },
        { value: 'cmdb_ci_server', label: 'Server (cmdb_ci_server)' },
        { value: 'cmdb_ci_computer', label: 'Computer (cmdb_ci_computer)' },
        { value: 'cmdb_ci_vm_instance', label: 'Virtual Machine (cmdb_ci_vm_instance)' },
        { value: 'cmn_location', label: 'Location (cmn_location)' },
        { value: 'core_company', label: 'Company (core_company)' },
        { value: 'sys_user', label: 'User (sys_user)' },
        { value: 'sys_user_group', label: 'Group (sys_user_group)' },
        { value: 'cmdb_model', label: 'Model (cmdb_model)' },
        { value: 'cmdb_ci_network_adapter', label: 'Network Adapter (cmdb_ci_network_adapter)' }
    ],
    
    // Subtypes per column type
    subtypesByType: {
        string: [
            { value: '', label: 'Select format (optional)...' },
            { value: 'serial-number', label: 'Serial Number' },
            { value: 'mac-address', label: 'MAC Address' },
            { value: 'ip-address-v4', label: 'IP Address (IPv4)' },
            { value: 'ip-address-v6', label: 'IP Address (IPv6)' },
            { value: 'hostname', label: 'Hostname' },
            { value: 'fqdn', label: 'FQDN (Fully Qualified Domain Name)' },
            { value: 'asset-tag', label: 'Asset Tag' },
            { value: 'location', label: 'Location' },
            { value: 'name', label: 'Name' },
            { value: 'model', label: 'Model' },
            { value: 'manufacturer', label: 'Manufacturer' },
            { value: 'os-version', label: 'OS Version' },
            { value: 'uuid', label: 'UUID/GUID' },
            { value: 'sys-id', label: 'ServiceNow sys_id' },
            { value: 'short-description', label: 'Short Description' },
            { value: 'description', label: 'Description' },
            { value: 'email', label: 'Email Address' },
            { value: 'url', label: 'URL' },
            { value: 'phone-number', label: 'Phone Number' }
        ],
        alphanumeric: [
            { value: '', label: 'Select format (optional)...' },
            { value: 'serial-number', label: 'Serial Number' },
            { value: 'mac-address', label: 'MAC Address' },
            { value: 'asset-tag', label: 'Asset Tag' },
            { value: 'hostname', label: 'Hostname' },
            { value: 'uuid', label: 'UUID/GUID' },
            { value: 'sys-id', label: 'ServiceNow sys_id' }
        ],
        number: [
            { value: '', label: 'Select format (optional)...' },
            { value: 'integer', label: 'Integer' },
            { value: 'positive-integer', label: 'Positive Integer' },
            { value: 'port-number', label: 'Port Number (0-65535)' },
            { value: 'percentage', label: 'Percentage (0-100)' },
            { value: 'currency', label: 'Currency (2 decimals)' },
            { value: 'decimal', label: 'Decimal (2 decimals)' },
            { value: 'memory-mb', label: 'Memory (MB)' },
            { value: 'memory-gb', label: 'Memory (GB)' },
            { value: 'cpu-count', label: 'CPU Count' },
            { value: 'disk-gb', label: 'Disk Size (GB)' }
        ],
        date: [
            { value: '', label: 'Select format (optional)...' },
            { value: 'date-only', label: 'Date Only (YYYY-MM-DD)' },
            { value: 'datetime', label: 'DateTime (YYYY-MM-DD HH:mm:ss)' },
            { value: 'time-only', label: 'Time Only (HH:mm:ss)' },
            { value: 'servicenow-datetime', label: 'ServiceNow DateTime' }
        ],
        boolean: [
            { value: '', label: 'Select format (optional)...' },
            { value: 'standard', label: 'Boolean (true/false)' },
            { value: 'yes-no', label: 'Boolean (Yes/No)' },
            { value: 'one-zero', label: 'Boolean (1/0)' }
        ]
    },
    
    async init() {
        console.log('[Phase2] init() called');
        
        try {
            await this.loadUploadedData();
            this.renderColumns();
            this.setupEventListeners();
            console.log('[Phase2] init() completed successfully');
        } catch (error) {
            console.error('[Phase2] init() failed:', error);
            throw error;
        }
    },
    
    async loadUploadedData() {
        console.log('[Phase2] loadUploadedData() starting...');
        try {
            const response = await fetch('/api/phase2/columns');
            
            if (!response.ok) {
                throw new Error('No data available');
            }
            
            const data = await response.json();
            console.log('[Phase2] Data received');
            
            this.fileData = data;
            this.columns = data.columns;
            
            // Update quality widget - Show "TBD" instead of percentage
            const widgetQualityScore = document.getElementById('widgetQualityScore');
            if (widgetQualityScore) {
                // Show "TBD" to indicate score will be calculated in Phase 3
                widgetQualityScore.innerHTML = `<span style="font-size: 0.6em;">TBD</span>`;
            }
            
            const widgetTotalRecords = document.getElementById('widgetTotalRecords');
            if (widgetTotalRecords) {
                widgetTotalRecords.textContent = data.totalRecords.toLocaleString();
            }
            
            const widgetTotalColumns = document.getElementById('widgetTotalColumns');
            if (widgetTotalColumns) {
                widgetTotalColumns.textContent = data.columns.length;
            }
            
            const widgetFileName = document.getElementById('widgetFileName');
            if (widgetFileName) {
                widgetFileName.textContent = data.fileName;
            }
            
            const widgetFileSize = document.getElementById('widgetFileSize');
            if (widgetFileSize && typeof App !== 'undefined' && typeof App.formatFileSize === 'function') {
                widgetFileSize.textContent = App.formatFileSize(data.fileSize);
            }
            
        } catch (error) {
            console.error('[Phase2] Error in loadUploadedData():', error);
            alert('No file uploaded. Please upload a file in Phase 1 first.');
            window.location.href = '/phase1';
        }
    },
    
    // Get subtypes for a column type
    getSubtypesForType(columnType) {
        return this.subtypesByType[columnType] || [];
    },
    
    renderColumns() {
        console.log('[Phase2] renderColumns() starting with', this.columns.length, 'columns');
        const container = document.getElementById('columnsContainer');
        if (!container) {
            console.error('[Phase2] columnsContainer not found!');
            return;
        }
        
        container.innerHTML = this.columns.map((col, index) => {
            const subtypes = this.getSubtypesForType(col.type);
            const hasSubtypes = subtypes.length > 0;
            
            return `
            <div class="column-card" data-index="${index}">
                <div class="column-card-header">
                    <h3 class="column-name">${col.name}</h3>
                    <div class="column-header-actions">
                        <select class="column-type-select" data-index="${index}">
                            <option value="string" ${col.type === 'string' ? 'selected' : ''}>String</option>
                            <option value="number" ${col.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="date" ${col.type === 'date' ? 'selected' : ''}>Date</option>
                            <option value="alphanumeric" ${col.type === 'alphanumeric' ? 'selected' : ''}>Alpha-numeric</option>
                            <option value="boolean" ${col.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        </select>
                        <button class="btn-remove-column" data-index="${index}" title="Remove column">
                            ✕
                        </button>
                    </div>
                </div>
                
                <!-- Data Format Selection (shown for all types) -->
                <div class="subtype-selection" id="subtypeSelection_${index}" style="display: ${hasSubtypes ? 'block' : 'none'}; margin: 0.5rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <label class="form-label" style="font-size: 0.85rem; margin-bottom: 0.25rem; color: #666;">
                        📋 Data Format:
                    </label>
                    <select class="form-input subtype-select" data-index="${index}" style="font-size: 0.9rem;">
                        ${subtypes.map(subtype => 
                            `<option value="${subtype.value}" ${col.subtype === subtype.value ? 'selected' : ''}>${subtype.label}</option>`
                        ).join('')}
                    </select>
                    <small style="display: block; color: #888; font-size: 0.75rem; margin-top: 0.25rem;">
                        Select format for ServiceNow-specific validation
                    </small>
                </div>
                
                <div class="column-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Records:</span>
                        <span class="stat-value">${col.totalRecords.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Empty:</span>
                        <span class="stat-value stat-warning">${col.emptyRecords.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Duplicates:</span>
                        <span class="stat-value ${col.duplicates > 0 ? 'stat-warning' : ''}">${col.duplicates.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Unique Values:</span>
                        <span class="stat-value stat-success">${col.uniqueValues.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="column-options">
                    <label class="checkbox-label">
                        <input type="checkbox" 
                               class="unique-qualifier-check" 
                               data-index="${index}"
                               ${col.isUniqueQualifier ? 'checked' : ''}>
                        <span>Include in Unique Qualifier</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" 
                               class="reference-data-check" 
                               data-index="${index}"
                               ${col.isReferenceData ? 'checked' : ''}>
                        <span>Reference Data (ServiceNow Check)</span>
                    </label>
                    
                    <!-- ServiceNow Table Selection (hidden by default) -->
                    <div class="snow-table-selection" id="snowTable_${index}" style="display: ${col.isReferenceData ? 'block' : 'none'}; margin-top: 0.5rem;">
                        <label class="form-label" style="font-size: 0.9rem; margin-bottom: 0.25rem;">ServiceNow Table:</label>
                        <select class="form-input snow-table-select" data-index="${index}" style="font-size: 0.9rem;">
                            <option value="">Select table...</option>
                            ${this.snowTables.map(table => 
                                `<option value="${table.value}" ${col.serviceNowTable === table.value ? 'selected' : ''}>${table.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `}).join('');
        
        this.attachColumnEventListeners();
        this.updateColumnCount();
        console.log('[Phase2] renderColumns() completed');
    },
    
    attachColumnEventListeners() {
        // Type change - update subtype options
        document.querySelectorAll('.column-type-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const newType = e.target.value;
                this.columns[index].type = newType;
                this.columns[index].subtype = ''; // Reset subtype when type changes
                
                // Update subtype dropdown
                const subtypeSelection = document.getElementById(`subtypeSelection_${index}`);
                const subtypeSelect = subtypeSelection.querySelector('.subtype-select');
                const subtypes = this.getSubtypesForType(newType);
                
                if (subtypes.length > 0) {
                    subtypeSelection.style.display = 'block';
                    subtypeSelect.innerHTML = subtypes.map(subtype => 
                        `<option value="${subtype.value}">${subtype.label}</option>`
                    ).join('');
                } else {
                    subtypeSelection.style.display = 'none';
                }
                
                console.log(`Column ${this.columns[index].name} type changed to ${newType}`);
            });
        });
        
        // Subtype change
        document.querySelectorAll('.subtype-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.columns[index].subtype = e.target.value;
                console.log(`Column ${this.columns[index].name} subtype changed to ${e.target.value}`);
            });
        });
        
        // Unique qualifier checkbox
        document.querySelectorAll('.unique-qualifier-check').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.columns[index].isUniqueQualifier = e.target.checked;
                console.log(`Column ${this.columns[index].name} unique qualifier: ${e.target.checked}`);
            });
        });
        
        // Reference data checkbox - NOW SHOWS/HIDES TABLE SELECTION
        document.querySelectorAll('.reference-data-check').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const isChecked = e.target.checked;
                
                this.columns[index].isReferenceData = isChecked;
                
                // Show/hide ServiceNow table selection
                const tableSelection = document.getElementById(`snowTable_${index}`);
                if (tableSelection) {
                    tableSelection.style.display = isChecked ? 'block' : 'none';
                }
                
                console.log(`Column ${this.columns[index].name} reference data: ${isChecked}`);
            });
        });
        
        // ServiceNow table selection
        document.querySelectorAll('.snow-table-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.columns[index].serviceNowTable = e.target.value;
                console.log(`Column ${this.columns[index].name} ServiceNow table: ${e.target.value}`);
            });
        });
        
        // Remove column button
        document.querySelectorAll('.btn-remove-column').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeColumn(index);
            });
        });
    },
    
    removeColumn(index) {
        const columnName = this.columns[index].name;
        
        if (confirm(`Are you sure you want to remove column "${columnName}"?`)) {
            this.columns.splice(index, 1);
            this.renderColumns();
            console.log(`Column "${columnName}" removed`);
        }
    },
    
    updateColumnCount() {
        const columnCountElement = document.getElementById('widgetTotalColumns');
        if (columnCountElement) {
            columnCountElement.textContent = this.columns.length;
        }
    },
    
    setupEventListeners() {
        console.log('[Phase2] setupEventListeners() starting');
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveConfiguration());
        }
        
        const continueBtn = document.getElementById('continuePhase3Btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueToPhase3());
        }
    },
    
    async continueToPhase3() {
        console.log('[Phase2] continueToPhase3() called');
        
        // Validate: if reference data is checked, table must be selected
        let hasError = false;
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            if (col.isReferenceData && !col.serviceNowTable) {
                alert(`Please select a ServiceNow table for column "${col.name}"`);
                hasError = true;
                break;
            }
        }
        
        if (hasError) return;
        
        try {
            const configuration = {
                columns: this.columns,
                totalRecords: this.fileData.totalRecords,
                fileName: this.fileData.fileName,
                dataQualityScore: null // Will be calculated in Phase 3
            };
            
            console.log('[Phase2] Auto-saving configuration for Phase 3:', configuration);
            
            const response = await fetch('/api/phase2/auto-save-for-phase3', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configuration)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }
            
            console.log('[Phase2] Configuration auto-saved successfully!');
            window.location.href = '/phase3';
            
        } catch (error) {
            console.error('[Phase2] Error saving configuration:', error);
            if (typeof App !== 'undefined') {
                App.showNotification('Error saving configuration. Please try again.');
            } else {
                alert('Error saving configuration. Please try again.');
            }
        }
    },
    
    saveConfiguration() {
        const configName = document.getElementById('configName');
        if (!configName || !configName.value.trim()) {
            if (typeof App !== 'undefined') {
                App.showNotification('Please enter a configuration name');
            } else {
                alert('Please enter a configuration name');
            }
            return;
        }
        
        this.configuration = {
            name: configName.value.trim(),
            timestamp: new Date().toISOString(),
            fileName: this.fileData.fileName,
            columnSettings: this.columns.map(col => ({
                name: col.name,
                type: col.type,
                subtype: col.subtype || '',
                isUniqueQualifier: col.isUniqueQualifier,
                isReferenceData: col.isReferenceData,
                serviceNowTable: col.serviceNowTable
            }))
        };
        
        console.log('Configuration saved:', this.configuration);
        if (typeof App !== 'undefined') {
            App.showNotification(`Configuration "${this.configuration.name}" saved successfully!`);
        } else {
            alert(`Configuration "${this.configuration.name}" saved successfully!`);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Phase2.init());
} else {
    Phase2.init();
}
