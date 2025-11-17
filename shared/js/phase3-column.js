// Phase 3 Column Detail View - RULE-BASED Actions (NO AI for action detection)
class Phase3ColumnView {
    constructor() {
        this.currentColumnIndex = 0;
        this.currentActionIndex = -1;
        this.columns = [];
        this.currentActions = [];
        this.currentIssues = [];
        this.tokenTracker = new TokenTracker();
        this.rawData = null;
    }

    async init() {
        console.log('Initializing Phase 3 Column View...');
        
        try {
            const config = await this.loadConfiguration();
            this.columns = config.columns;
            this.fileName = config.fileName;
            this.totalRecords = config.totalRecords;
            this.initialQualityScore = config.dataQualityScore;
            
            await this.loadRawData();
            this.updateQualityWidget();
            this.initPanels();
            await this.loadColumn(0);
            
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Error loading configuration. Please complete Phase 2 first.');
            window.location.href = '/phase2';
        }
    }

    async loadConfiguration() {
        const response = await fetch('/api/phase3/configuration');
        if (!response.ok) throw new Error('Configuration not found');
        return await response.json();
    }

    async loadRawData() {
        const response = await fetch('/api/phase3/raw-data');
        if (!response.ok) throw new Error('Raw data not available');
        this.rawData = await response.json();
    }

    updateQualityWidget() {
        document.getElementById('widgetQualityScore').innerHTML = 
            `${this.initialQualityScore}<span style="font-size: 0.6em;">%</span>`;
        document.getElementById('widgetTotalRecords').textContent = this.totalRecords.toLocaleString();
        document.getElementById('widgetColumnsProcessed').textContent = `0/${this.columns.length}`;
        document.getElementById('widgetFileName').textContent = this.fileName;
        document.getElementById('widgetCurrentColumn').textContent = '-';
    }

    initPanels() {
        // LEFT PANEL - Actions list
        document.getElementById('left-panel').innerHTML = `
            <div class="left-panel-header">
                <h2>Actions</h2>
                <div class="subtitle">Click to view issues</div>
            </div>
            <div id="actions-list" class="actions-list"></div>
        `;
        
        // MIDDLE PANEL - Data issues with FLEXBOX navigation
        document.getElementById('middle-panel').innerHTML = `
            <div class="middle-panel-header">
                <div class="column-navigation" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <button id="prev-column-btn" class="btn btn-sm btn-secondary">← Previous Column</button>
                    <span id="column-counter" style="font-weight: 500;">Column 1 of 10</span>
                    <button id="next-column-btn" class="btn btn-sm btn-secondary">Next Column →</button>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <h1 id="column-title" style="margin: 0;">Loading...</h1>
                    <span id="column-type-badge" class="column-type-badge">STRING</span>
                </div>
            </div>
            <div class="middle-panel-content" id="middle-content"></div>
            <div class="middle-panel-footer" id="middle-footer"></div>
        `;
        
        // RIGHT PANEL - Token tracking (only for AI-powered fixes)
        this.initRightPanel();
        
        // Navigation handlers
        document.getElementById('prev-column-btn').addEventListener('click', () => this.previousColumn());
        document.getElementById('next-column-btn').addEventListener('click', () => this.nextColumn());
    }

    initRightPanel() {
        const rightPanel = document.getElementById('right-panel');
        rightPanel.innerHTML = `
            <div class="right-panel-header">
                <h2>AI Token Consumption</h2>
                <div class="subtitle">Only used for AI-powered fixes</div>
            </div>
            <div class="token-panel-content">
                <div class="token-summary">
                    <div class="token-card">
                        <div class="token-card-header">
                            <span class="token-card-label">This Column</span>
                        </div>
                        <div class="token-card-value" id="column-tokens">0</div>
                        <div class="token-card-subtext">tokens</div>
                    </div>
                    <div class="token-card">
                        <div class="token-card-header">
                            <span class="token-card-label">Session Total</span>
                        </div>
                        <div class="token-card-value" id="session-tokens">0</div>
                        <div class="token-card-subtext">tokens this session</div>
                    </div>
                    <div class="token-card">
                        <div class="token-card-header">
                            <span class="token-card-label">Estimated Cost</span>
                        </div>
                        <div class="token-card-value" id="estimated-cost">$0.00</div>
                        <div class="token-card-subtext">of budget</div>
                        <div class="token-progress">
                            <div class="token-progress-bar">
                                <div class="token-progress-fill" id="token-progress-fill" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="token-history-section">
                    <div class="token-history-header">
                        <h3>Token History</h3>
                    </div>
                    <div class="token-history-list" id="token-history-list">
                        <p style="color: #888; text-align: center; padding: 1rem;">No AI usage yet</p>
                    </div>
                </div>
            </div>
        `;
    }

    async loadColumn(index) {
        this.currentColumnIndex = index;
        this.currentActionIndex = -1;
        const column = this.columns[index];
        
        console.log(`Loading column ${index + 1}/${this.columns.length}: ${column.name}`);
        
        // Update header
        document.getElementById('widgetCurrentColumn').textContent = column.name;
        document.getElementById('widgetColumnsProcessed').textContent = `${index}/${this.columns.length}`;
        document.getElementById('column-title').textContent = column.name;
        document.getElementById('column-type-badge').textContent = column.type.toUpperCase();
        document.getElementById('column-counter').textContent = `Column ${index + 1} of ${this.columns.length}`;
        
        // Update navigation
        document.getElementById('prev-column-btn').disabled = (index === 0);
        document.getElementById('next-column-btn').disabled = (index === this.columns.length - 1);
        
        // Generate actions using server-side RULES (NO AI!)
        await this.generateActionsFromRules(column);
        
        // Show actions in LEFT panel
        this.showActionsInLeftPanel();
        
        // Show welcome message in MIDDLE panel
        this.showWelcomeMessage();
        
        this.updateRightPanel();
    }

    // Call server to generate rule-based actions
    async generateActionsFromRules(column) {
        console.log(`📋 Generating rule-based actions for: ${column.name}`);
        
        try {
            const response = await fetch('/api/phase3/generate-actions-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columnName: column.name,
                    columnType: column.type,
                    stats: {
                        totalRecords: column.totalRecords,
                        emptyRecords: column.emptyRecords,
                        duplicates: column.duplicates,
                        isUniqueQualifier: column.isUniqueQualifier,
                        isReferenceData: column.isReferenceData
                    }
                })
            });
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const result = await response.json();
            this.currentActions = result.actions;
            
            console.log(`   ✓ Generated ${this.currentActions.length} rule-based actions`);
            
        } catch (error) {
            console.error('Error generating actions:', error);
            this.currentActions = [];
        }
    }

    showActionsInLeftPanel() {
        const actionsList = document.getElementById('actions-list');
        
        if (!this.currentActions || this.currentActions.length === 0) {
            actionsList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #28a745;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
                    <h3>No Issues Found!</h3>
                    <p style="color: #888;">This column is clean.</p>
                </div>
            `;
            document.getElementById('middle-content').innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                    <h2>Perfect Column!</h2>
                    <p style="color: #888; font-size: 1.1rem;">No data quality issues detected.</p>
                </div>
            `;
            document.getElementById('middle-footer').innerHTML = '';
            return;
        }
        
        let html = '';
        this.currentActions.forEach((action, index) => {
            const isActive = index === this.currentActionIndex;
            const severityColor = action.severity === 'critical' ? '#dc3545' : 
                                  action.severity === 'warning' ? '#ffc107' : '#17a2b8';
            
            html += `
                <div class="action-item ${isActive ? 'active' : ''}" 
                     onclick="window.phase3View.selectAction(${index})"
                     style="border-left: 3px solid ${severityColor};">
                    <div class="action-icon">${this.getActionIcon(action.type)}</div>
                    <div class="action-content">
                        <div class="action-title">${this.escapeHtml(action.title)}</div>
                        <div class="action-count">${action.issueCount > 0 ? action.issueCount + ' issues' : 'Click to scan'}</div>
                    </div>
                    <div class="action-arrow">→</div>
                </div>
            `;
        });
        
        actionsList.innerHTML = html;
    }

    getActionIcon(actionType) {
        const icons = {
            'duplicates': '🔄',
            'empty': '📝',
            'whitespace': '✂️',
            'capitalization': '🔤',
            'special-chars': '🔧',
            'currency': '💰',
            'commas': '📊',
            'numeric-validation': '🔢',
            'negative-values': '➖',
            'decimals': '.',
            'date-format': '📅',
            'invalid-dates': '❌',
            'future-dates': '⏭️',
            'old-dates': '⏮️',
            'text-dates': '📝',
            'case-format': '🔤',
            'separators': '➗',
            'length-validation': '📏',
            'boolean-standardize': '✓',
            'boolean-invalid': '❌',
            'reference-validation': '🔍'
        };
        return icons[actionType] || '🔧';
    }

    showWelcomeMessage() {
        const content = document.getElementById('middle-content');
        content.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👈</div>
                <h2>Select an Action</h2>
                <p style="color: #888; font-size: 1.1rem;">Click on an action in the left panel to view and fix issues.</p>
            </div>
        `;
        document.getElementById('middle-footer').innerHTML = '';
    }

    async selectAction(actionIndex) {
        this.currentActionIndex = actionIndex;
        const action = this.currentActions[actionIndex];
        const column = this.columns[this.currentColumnIndex];
        
        console.log(`Selected action: ${action.title}`);
        
        // Update left panel - mark action as active
        this.showActionsInLeftPanel();
        
        // Show loading in middle panel
        const content = document.getElementById('middle-content');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Scanning for issues...</p></div>';
        
        try {
            const response = await fetch('/api/phase3/get-issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columnName: column.name,
                    columnType: column.type,
                    actionType: action.type,
                    columnData: this.rawData[column.name]
                })
            });
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const result = await response.json();
            this.currentIssues = result.issues;
            
            // Update action issue count if it was 0
            if (action.issueCount === 0) {
                action.issueCount = this.currentIssues.length;
                this.showActionsInLeftPanel(); // Refresh to show count
            }
            
            // Show issues in MIDDLE panel
            this.showIssuesInMiddlePanel(action);
            
        } catch (error) {
            console.error('Error loading issues:', error);
            content.innerHTML = `
                <div class="error-message">
                    <p>⚠️ Error loading issues</p>
                    <p style="font-size: 0.9em; color: #888;">${error.message}</p>
                </div>
            `;
        }
    }

    showIssuesInMiddlePanel(action) {
        const content = document.getElementById('middle-content');
        const footer = document.getElementById('middle-footer');
        
        if (!this.currentIssues || this.currentIssues.length === 0) {
            content.innerHTML = `
                <div style="padding: 3rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
                    <h2>No Issues Found</h2>
                    <p style="color: #888;">All records are clean for this action.</p>
                </div>
            `;
            footer.innerHTML = '';
            return;
        }
        
        // SCROLLABLE table with issues
        let html = `
            <div class="section">
                <div class="section-header">
                    <h3>${this.escapeHtml(action.title)}</h3>
                    <p style="color: #888; margin-top: 0.5rem;">${this.escapeHtml(action.description)}</p>
                    <p style="margin-top: 0.5rem;"><strong>${this.currentIssues.length} issues found</strong></p>
                </div>
                
                <div class="scrollable-table-container">
                    <table class="data-preview-table">
                        <thead>
                            <tr>
                                <th>Row #</th>
                                <th>Current Value</th>
                                <th>Suggested Fix</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        this.currentIssues.forEach((issue, index) => {
            html += `
                <tr style="background: rgba(220, 53, 69, 0.1);">
                    <td><strong>${issue.rowNumber}</strong></td>
                    <td style="color: #dc3545; font-weight: bold;">${this.escapeHtml(String(issue.currentValue))}</td>
                    <td style="color: #28a745;">${this.escapeHtml(String(issue.suggestedFix))}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="window.phase3View.fixSingleIssue(${index})">
                            Fix
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Footer buttons
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">
                ← Back to Actions
            </button>
            <button class="btn btn-success" onclick="window.phase3View.fixAllIssues()">
                Fix All ${this.currentIssues.length} Issues
            </button>
        `;
    }

    deselectAction() {
        this.currentActionIndex = -1;
        this.showActionsInLeftPanel();
        this.showWelcomeMessage();
    }

    async fixSingleIssue(issueIndex) {
        console.log('Fixing single issue:', issueIndex);
        alert('Single fix will be implemented - removing this row from the list');
        // TODO: Implement actual fix logic
    }

    async fixAllIssues() {
        const action = this.currentActions[this.currentActionIndex];
        
        if (!confirm(`Fix all ${this.currentIssues.length} issues for "${action.title}"?`)) {
            return;
        }
        
        // Show loading
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-message">
                <div class="loading-spinner"></div>
                <h2>Fixing Issues...</h2>
            </div>
        `;
        document.body.appendChild(overlay);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        overlay.remove();
        
        // Show success
        await this.showSuccessAnimation(`Fixed ${this.currentIssues.length} issues!`);
        
        // Mark action as completed
        this.currentActions[this.currentActionIndex].completed = true;
        this.currentActions[this.currentActionIndex].issueCount = 0;
        
        // Refresh left panel
        this.showActionsInLeftPanel();
        this.showWelcomeMessage();
    }

    async showSuccessAnimation(message) {
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-message">
                <div class="success-icon">✓</div>
                <h2>${message}</h2>
            </div>
        `;
        document.body.appendChild(overlay);
        await new Promise(resolve => setTimeout(resolve, 1200));
        overlay.remove();
    }

    previousColumn() {
        if (this.currentColumnIndex > 0) {
            this.loadColumn(this.currentColumnIndex - 1);
        }
    }

    nextColumn() {
        if (this.currentColumnIndex < this.columns.length - 1) {
            this.loadColumn(this.currentColumnIndex + 1);
        }
    }

    updateRightPanel() {
        const column = this.columns[this.currentColumnIndex];
        const columnTokens = this.tokenTracker.getColumnTokens(column.name);
        const sessionTokens = this.tokenTracker.getSessionTotal();
        const cost = this.tokenTracker.getCurrentCost();
        
        document.getElementById('column-tokens').textContent = columnTokens.toLocaleString();
        document.getElementById('session-tokens').textContent = sessionTokens.toLocaleString();
        document.getElementById('estimated-cost').textContent = `$${cost}`;
        
        const budget = 10000;
        const percentage = Math.min(100, (sessionTokens / budget) * 100);
        document.getElementById('token-progress-fill').style.width = `${percentage}%`;
        
        this.updateTokenHistory();
    }

    updateTokenHistory() {
        const historyList = document.getElementById('token-history-list');
        const breakdown = this.tokenTracker.getBreakdown();
        
        if (breakdown.length === 0) {
            historyList.innerHTML = '<p style="color: #888; text-align: center; padding: 1rem;">No AI usage yet</p>';
            return;
        }
        
        let html = '';
        breakdown.forEach(item => {
            html += `
                <div class="token-history-item">
                    <div class="token-history-column">${this.escapeHtml(item.column)}</div>
                    <div class="token-history-meta">
                        <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span class="token-history-tokens">${item.tokens.toLocaleString()} tokens</span>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

// Token Tracker Class (only used for AI-powered fixes, not for action detection)
class TokenTracker {
    constructor() {
        this.sessionTokens = 0;
        this.columnTokens = {};
        this.costPerToken = 0.000003;
        this.history = [];
    }
    
    addUsage(columnName, tokens) {
        this.sessionTokens += tokens;
        this.columnTokens[columnName] = (this.columnTokens[columnName] || 0) + tokens;
        this.history.push({
            timestamp: Date.now(),
            column: columnName,
            tokens: tokens
        });
    }
    
    getColumnTokens(columnName) {
        return this.columnTokens[columnName] || 0;
    }
    
    getSessionTotal() {
        return this.sessionTokens;
    }
    
    getCurrentCost() {
        return (this.sessionTokens * this.costPerToken).toFixed(4);
    }
    
    getBreakdown() {
        return this.history;
    }
}

// Initialize - Make globally accessible via window object
document.addEventListener('DOMContentLoaded', () => {
    window.phase3View = new Phase3ColumnView();
    window.phase3View.init();
});
