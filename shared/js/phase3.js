// Phase 3: AI Remediation Logic

const Phase3 = {
    configuration: null,
    currentColumnIndex: 0,
    qualityScore: null,
    qualityBreakdown: null,
    
    async init() {
        console.log('Phase 3 initialized');
        await this.loadConfiguration();
        await this.calculateQualityScore();
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
            
            // Update basic widget info (score will be updated after calculation)
            document.getElementById('widgetQualityScore').innerHTML = 
                `<span style="font-size: 0.6em;">Calculating...</span>`;
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
    
    async calculateQualityScore() {
        try {
            console.log('📊 Calculating quality score...');
            
            const response = await fetch('/api/phase3/calculate-quality-score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to calculate quality score');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.qualityScore = result.qualityScore;
                this.qualityBreakdown = result.breakdown;
                
                // Update widget with calculated score
                const widgetQualityScore = document.getElementById('widgetQualityScore');
                if (widgetQualityScore) {
                    widgetQualityScore.innerHTML = `${result.qualityScore}<span style="font-size: 0.6em;">%</span>`;
                    
                    // Color based on score
                    if (result.qualityScore >= 80) {
                        widgetQualityScore.style.color = '#28a745';
                    } else if (result.qualityScore >= 60) {
                        widgetQualityScore.style.color = '#ffc107';
                    } else {
                        widgetQualityScore.style.color = '#dc3545';
                    }
                }
                
                console.log('📊 Quality Score:', result.qualityScore + '%');
                console.log('📊 Breakdown:', result.breakdown);
                
                // Store column details for display
                this.columnDetails = result.columnDetails;
                
                // Update breakdown cards
                this.updateBreakdownCards();
            }
            
        } catch (error) {
            console.error('Error calculating quality score:', error);
            // Show error state
            const widgetQualityScore = document.getElementById('widgetQualityScore');
            if (widgetQualityScore) {
                widgetQualityScore.innerHTML = `<span style="font-size: 0.6em;">Error</span>`;
            }
        }
    },
    
    updateBreakdownCards() {
        if (!this.qualityBreakdown) return;
        
        // Helper to get score color class
        const getColorClass = (score) => {
            if (score >= 80) return '';
            if (score >= 60) return 'warning';
            return 'danger';
        };
        
        // Update Uniqueness
        const uniqueness = this.qualityBreakdown.uniqueness;
        const uniquenessScore = document.getElementById('uniquenessScore');
        if (uniquenessScore) {
            uniquenessScore.textContent = uniqueness.score + '%';
            uniquenessScore.className = 'breakdown-score ' + getColorClass(uniqueness.score);
        }
        const uniquenessDetail = document.getElementById('uniquenessDetail');
        if (uniquenessDetail) {
            uniquenessDetail.textContent = `(${Math.round(uniqueness.weight * 100)}% weight · ${uniqueness.issues} issues)`;
        }
        
        // Update Validity
        const validity = this.qualityBreakdown.validity;
        const validityScore = document.getElementById('validityScore');
        if (validityScore) {
            validityScore.textContent = validity.score + '%';
            validityScore.className = 'breakdown-score ' + getColorClass(validity.score);
        }
        const validityDetail = document.getElementById('validityDetail');
        if (validityDetail) {
            validityDetail.textContent = `(${Math.round(validity.weight * 100)}% weight · ${validity.issues} issues)`;
        }
        
        // Update Consistency
        const consistency = this.qualityBreakdown.consistency;
        const consistencyScore = document.getElementById('consistencyScore');
        if (consistencyScore) {
            consistencyScore.textContent = consistency.score + '%';
            consistencyScore.className = 'breakdown-score ' + getColorClass(consistency.score);
        }
        const consistencyDetail = document.getElementById('consistencyDetail');
        if (consistencyDetail) {
            consistencyDetail.textContent = `(${Math.round(consistency.weight * 100)}% weight · ${consistency.issues} issues)`;
        }
        
        // Update Accuracy
        const accuracy = this.qualityBreakdown.accuracy;
        const accuracyScore = document.getElementById('accuracyScore');
        const accuracyCard = document.getElementById('accuracyCard');
        if (accuracyScore) {
            if (accuracy.weight === 0) {
                // No reference data columns - hide or show N/A
                accuracyScore.textContent = 'N/A';
                accuracyScore.className = 'breakdown-score';
                if (accuracyCard) {
                    accuracyCard.style.opacity = '0.5';
                }
            } else {
                accuracyScore.textContent = accuracy.score + '%';
                accuracyScore.className = 'breakdown-score ' + getColorClass(accuracy.score);
            }
        }
        const accuracyDetail = document.getElementById('accuracyDetail');
        if (accuracyDetail) {
            if (accuracy.weight === 0) {
                accuracyDetail.textContent = '(No reference data)';
            } else {
                accuracyDetail.textContent = `(${Math.round(accuracy.weight * 100)}% weight · ${accuracy.issues} issues)`;
            }
        }
    },
    
    renderExplanationPage() {
        // Update columns count
        const columnsCount = document.getElementById('columnsCount');
        if (columnsCount) {
            columnsCount.textContent = this.configuration.columns.length;
        }
        
        // Render columns list with issue counts
        const columnsList = document.getElementById('columnsList');
        if (columnsList && this.configuration.columns.length > 0) {
            columnsList.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem;">
                    ${this.configuration.columns.map((col, index) => {
                        // Get issue details if available
                        const colDetail = this.columnDetails?.find(c => c.name === col.name);
                        const totalIssues = colDetail?.issues?.total || 0;
                        
                        return `
                        <div style="padding: 0.75rem; background: rgba(0, 255, 65, 0.05); border: 1px solid rgba(0, 255, 65, 0.2); border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <div style="font-weight: bold; color: #74a290ff;">
                                    ${index + 1}. ${col.name}
                                </div>
                                ${totalIssues > 0 ? `
                                    <span style="background: #dc3545; color: white; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.75rem;">
                                        ${totalIssues} issues
                                    </span>
                                ` : `
                                    <span style="background: #28a745; color: white; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.75rem;">
                                        ✓ OK
                                    </span>
                                `}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; text-transform: uppercase;">
                                ${col.type}
                                ${col.isUniqueQualifier ? ' · 🔑 Unique' : ''}
                                ${col.isReferenceData ? ' · 🔗 Reference' : ''}
                            </div>
                            ${colDetail && totalIssues > 0 ? `
                                <div style="font-size: 0.75rem; color: #aaa; margin-top: 0.25rem;">
                                    ${colDetail.issues.uniqueness > 0 ? `📋 ${colDetail.issues.uniqueness} duplicates · ` : ''}
                                    ${colDetail.issues.validity > 0 ? `⚠️ ${colDetail.issues.validity} invalid · ` : ''}
                                    ${colDetail.issues.consistency > 0 ? `🔤 ${colDetail.issues.consistency} inconsistent` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `}).join('')}
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
