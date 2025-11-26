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
            
            // Update quality widget
            const widgetQualityScore = document.getElementById('widgetQualityScore');
            if (widgetQualityScore) {
                widgetQualityScore.innerHTML = `${data.dataQualityScore}<span style="font-size: 0.6em;">%</span>`;
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
    
    renderColumns() {
        console.log('[Phase2] renderColumns() starting with', this.columns.length, 'columns');
        const container = document.getElementById('columnsContainer');
        if (!container) {
            console.error('[Phase2] columnsContainer not found!');
            return;
        }
        
        container.innerHTML = this.columns.map((col, index) => `
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
        `).join('');
        
        this.attachColumnEventListeners();
        this.updateColumnCount();
        console.log('[Phase2] renderColumns() completed');
    },
    
    attachColumnEventListeners() {
        // Type change
        document.querySelectorAll('.column-type-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.columns[index].type = e.target.value;
                console.log(`Column ${this.columns[index].name} type changed to ${e.target.value}`);
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
                dataQualityScore: this.fileData.dataQualityScore
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
