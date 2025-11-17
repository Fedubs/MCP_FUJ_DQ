// Phase 3: AI Remediation Logic

const Phase3 = {
    configuration: null,
    currentColumnIndex: 0,
    
    async init() {
        console.log('Phase 3 initialized');
        await this.loadConfiguration();
        this.renderExplanationPage();
        this.setupEventListeners();
    },
    
    async loadConfiguration() {
        try {
            const response = await fetch('/api/phase3/configuration');
            
            if (!response.ok) {
                throw new Error('No configuration available');
            }
            
            this.configuration = await response.json();
            console.log('Phase 3 configuration loaded:', this.configuration);
            
            // Update quality widget
            document.getElementById('widgetQualityScore').innerHTML = 
                `${this.configuration.dataQualityScore}<span style="font-size: 0.6em;">%</span>`;
            document.getElementById('widgetTotalRecords').textContent = 
                this.configuration.totalRecords.toLocaleString();
            document.getElementById('widgetColumnsToRemediate').textContent = 
                this.configuration.columns.length;
            document.getElementById('widgetFileName').textContent = 
                this.configuration.fileName;
            document.getElementById('widgetProgress').textContent = 
                `0/${this.configuration.columns.length}`;
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            alert('No configuration found. Please complete Phase 2 first.');
            window.location.href = '/phase2';
        }
    },
    
    renderExplanationPage() {
        // Update columns count
        const columnsCount = document.getElementById('columnsCount');
        if (columnsCount) {
            columnsCount.textContent = this.configuration.columns.length;
        }
        
        // Render columns list
        const columnsList = document.getElementById('columnsList');
        if (columnsList && this.configuration.columns.length > 0) {
            columnsList.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                    ${this.configuration.columns.map((col, index) => `
                        <div style="padding: 0.75rem; background: rgba(0, 255, 65, 0.05); border: 1px solid rgba(0, 255, 65, 0.2); border-radius: 4px;">
                            <div style="font-weight: bold; color: #74a290ff;; margin-bottom: 0.25rem;">
                                ${index + 1}. ${col.name}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; text-transform: uppercase;">
                                ${col.type}
                            </div>
                            <div style="font-size: 0.85rem; color: #ccc; margin-top: 0.25rem;">
                                ${col.emptyRecords > 0 ? `⚠️ ${col.emptyRecords} empty` : ''}
                                ${col.duplicates > 0 ? ` · 📋 ${col.duplicates} dupes` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    },
    
    setupEventListeners() {
        const beginBtn = document.getElementById('beginRemediationBtn');
        if (beginBtn) {
            beginBtn.addEventListener('click', () => this.startRemediation());
        }
    },
    
    startRemediation() {
        console.log('Starting remediation - navigating to column detail view...');
        
        // Navigate to first column in three-panel view
        if (this.configuration && this.configuration.columns.length > 0) {
            const firstColumn = this.configuration.columns[0].name;
            window.location.href = `/phase3/column/${encodeURIComponent(firstColumn)}`;
        } else {
            alert('No columns available for remediation.');
        }
    }
};

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Phase3.init());
} else {
    // DOM is already ready
    Phase3.init();
}
