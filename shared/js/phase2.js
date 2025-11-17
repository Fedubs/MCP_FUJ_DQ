// Phase 2: Analysis Logic

console.log('[Phase2] Script loaded at:', new Date().toISOString());

const Phase2 = {
    columns: [],
    fileData: null,
    configuration: {
        name: '',
        columnSettings: []
    },
    
    async init() {
        console.log('[Phase2] init() called');
        console.log('[Phase2] App object available?', typeof App !== 'undefined');
        console.log('[Phase2] App.formatFileSize available?', typeof App?.formatFileSize === 'function');
        
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
            console.log('[Phase2] Fetching /api/phase2/columns...');
            const response = await fetch('/api/phase2/columns');
            
            console.log('[Phase2] Response status:', response.status);
            
            if (!response.ok) {
                throw new Error('No data available');
            }
            
            const data = await response.json();
            console.log('[Phase2] Data received:', {
                fileName: data.fileName,
                totalRecords: data.totalRecords,
                totalColumns: data.columns?.length,
                dataQualityScore: data.dataQualityScore
            });
            
            this.fileData = data;
            this.columns = data.columns;
            
            // Update quality widget with real data
            console.log('[Phase2] Updating quality widget...');
            
            const widgetQualityScore = document.getElementById('widgetQualityScore');
            console.log('[Phase2] widgetQualityScore element:', widgetQualityScore);
            if (widgetQualityScore) {
                widgetQualityScore.innerHTML = `${data.dataQualityScore}<span style="font-size: 0.6em;">%</span>`;
                console.log('[Phase2] Quality score updated to:', data.dataQualityScore);
            }
            
            const widgetTotalRecords = document.getElementById('widgetTotalRecords');
            console.log('[Phase2] widgetTotalRecords element:', widgetTotalRecords);
            if (widgetTotalRecords) {
                widgetTotalRecords.textContent = data.totalRecords.toLocaleString();
            }
            
            const widgetTotalColumns = document.getElementById('widgetTotalColumns');
            console.log('[Phase2] widgetTotalColumns element:', widgetTotalColumns);
            if (widgetTotalColumns) {
                widgetTotalColumns.textContent = data.columns.length;
            }
            
            const widgetFileName = document.getElementById('widgetFileName');
            console.log('[Phase2] widgetFileName element:', widgetFileName);
            if (widgetFileName) {
                widgetFileName.textContent = data.fileName;
            }
            
            const widgetFileSize = document.getElementById('widgetFileSize');
            console.log('[Phase2] widgetFileSize element:', widgetFileSize);
            console.log('[Phase2] About to call App.formatFileSize with:', data.fileSize);
            console.log('[Phase2] App object:', App);
            
            if (widgetFileSize) {
                if (typeof App !== 'undefined' && typeof App.formatFileSize === 'function') {
                    widgetFileSize.textContent = App.formatFileSize(data.fileSize);
                    console.log('[Phase2] File size updated successfully');
                } else {
                    console.error('[Phase2] App.formatFileSize not available!');
                    console.error('[Phase2] App:', typeof App);
                    console.error('[Phase2] App.formatFileSize:', typeof App?.formatFileSize);
                    widgetFileSize.textContent = data.fileSize + ' bytes';
                }
            }
            
            console.log('[Phase2] loadUploadedData() completed successfully');
            
        } catch (error) {
            console.error('[Phase2] Error in loadUploadedData():', error);
            console.error('[Phase2] Error stack:', error.stack);
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
        
        // Reference data checkbox
        document.querySelectorAll('.reference-data-check').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.columns[index].isReferenceData = e.target.checked;
                console.log(`Column ${this.columns[index].name} reference data: ${e.target.checked}`);
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
            // Remove from array
            this.columns.splice(index, 1);
            
            // Re-render
            this.renderColumns();
            
            console.log(`Column "${columnName}" removed`);
        }
    },
    
    updateColumnCount() {
        // Update the column count in the quality widget
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
            console.log('[Phase2] Save button listener attached');
        }
        
        // NEW: Continue to Phase 3 button
        const continueBtn = document.getElementById('continuePhase3Btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueToPhase3());
            console.log('[Phase2] Continue button listener attached');
        }
    },
    
    // NEW: Auto-save configuration and continue to Phase 3
    async continueToPhase3() {
        console.log('[Phase2] continueToPhase3() called');
        try {
            // Auto-save current column configuration to server
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
            
            // Navigate to Phase 3
            window.location.href = '/phase3';
            
        } catch (error) {
            console.error('[Phase2] Error saving configuration:', error);
            App.showNotification('Error saving configuration. Please try again.');
        }
    },
    
    saveConfiguration() {
        const configName = document.getElementById('configName');
        if (!configName || !configName.value.trim()) {
            App.showNotification('Please enter a configuration name');
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
                isReferenceData: col.isReferenceData
            }))
        };
        
        console.log('Configuration saved:', this.configuration);
        App.showNotification(`Configuration "${this.configuration.name}" saved successfully!`);
        
        // TODO: Send to backend to save permanently
        // await App.apiCall('/phase2/save-configuration', {
        //     method: 'POST',
        //     body: JSON.stringify(this.configuration)
        // });
    }
};

// Wait for DOM to be ready before initializing
console.log('[Phase2] Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    console.log('[Phase2] Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Phase2] DOMContentLoaded fired, calling Phase2.init()');
        Phase2.init();
    });
} else {
    // DOM is already ready
    console.log('[Phase2] DOM already ready, calling Phase2.init() immediately');
    Phase2.init();
}
