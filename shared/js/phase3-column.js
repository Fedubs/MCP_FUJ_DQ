// Phase 3 Column Detail View - RULE-BASED Actions with AI caching
class Phase3ColumnView {
    constructor() {
        this.currentColumnIndex = 0;
        this.currentActionIndex = -1;
        this.columns = [];
        this.currentActions = [];
        this.currentIssues = [];
        this.tokenTracker = new TokenTracker();
        this.rawData = null;
        this.duplicateActions = {}; // Track actions chosen for each duplicate value
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
        const prevBtn = document.getElementById('prev-column-btn');
        const nextBtn = document.getElementById('next-column-btn');
        
        this.prevBtnHandler = () => this.previousColumn();
        this.nextBtnHandler = () => this.nextColumn();
        
        prevBtn.addEventListener('click', this.prevBtnHandler);
        nextBtn.addEventListener('click', this.nextBtnHandler);
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
        console.log(`🔍 loadColumn called with index: ${index}`);
        
        this.currentColumnIndex = index;
        this.currentActionIndex = -1;
        const column = this.columns[index];
        
        // Reset duplicate actions when changing columns
        this.duplicateActions = {};
        
        console.log(`📋 Loading column ${index + 1}/${this.columns.length}: ${column.name}`);
        
        // Update header
        document.getElementById('widgetCurrentColumn').textContent = column.name;
        document.getElementById('widgetColumnsProcessed').textContent = `${index}/${this.columns.length}`;
        document.getElementById('column-title').textContent = column.name;
        document.getElementById('column-type-badge').textContent = column.type.toUpperCase();
        document.getElementById('column-counter').textContent = `Column ${index + 1} of ${this.columns.length}`;
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-column-btn');
        const nextBtn = document.getElementById('next-column-btn');
        
        prevBtn.disabled = (index === 0);
        
        if (index === this.columns.length - 1) {
            nextBtn.textContent = 'Go to Export →';
            nextBtn.className = 'btn btn-sm btn-success';
            nextBtn.disabled = false;
            nextBtn.removeEventListener('click', this.nextBtnHandler);
            nextBtn.onclick = () => window.location.href = '/phase4';
        } else {
            nextBtn.textContent = 'Next Column →';
            nextBtn.className = 'btn btn-sm btn-secondary';
            nextBtn.disabled = false;
            nextBtn.onclick = null;
            if (!nextBtn.hasAttribute('data-listener-added')) {
                nextBtn.addEventListener('click', this.nextBtnHandler);
                nextBtn.setAttribute('data-listener-added', 'true');
            }
        }
        
        await this.generateActionsFromRules(column);
        this.showActionsInLeftPanel();
        this.showWelcomeMessage();
        this.updateRightPanel();
    }

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
                     onclick="window.phase3View.selectAction(${index}, true)"
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
            'reference-validation': '🔍',
            'ai-validation': '🤖'
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

    async selectAction(actionIndex, forceRescan = true) {
        this.currentActionIndex = actionIndex;
        const action = this.currentActions[actionIndex];
        const column = this.columns[this.currentColumnIndex];
        
        console.log(`Selected action: ${action.title} (type: ${action.type})`);
        
        this.showActionsInLeftPanel();
        
        if (!forceRescan && action.cachedIssues && action.cachedIssues.length > 0) {
            console.log(`✓ Using cached issues (${action.cachedIssues.length})`);
            this.currentIssues = action.cachedIssues;
            action.issueCount = this.currentIssues.length;
            this.showActionsInLeftPanel();
            this.showIssuesInMiddlePanel(action);
            return;
        }
        
        const content = document.getElementById('middle-content');
        content.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Scanning for issues...</p></div>';
        
        try {
            await this.loadRawData();
            
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
            
            // Add status property to each issue
            this.currentIssues.forEach(issue => {
                issue.status = 'pending'; // pending, kept, rejected, changed
                issue.originalValue = issue.currentValue;
            });
            
            action.cachedIssues = [...this.currentIssues];
            console.log(`✓ Cached ${this.currentIssues.length} issues`);
            
            if (action.type === 'ai-validation' && result.tokensUsed) {
                this.tokenTracker.addUsage(column.name, result.tokensUsed);
                this.updateRightPanel();
            }
            
            action.issueCount = this.currentIssues.length;
            this.showActionsInLeftPanel();
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
        
        let html = `
            <div class="section">
                <div class="section-header">
                    <h3>${this.escapeHtml(action.title)}</h3>
                    <p style="color: #888; margin-top: 0.5rem;">${this.escapeHtml(action.description)}</p>
                    <p style="margin-top: 0.5rem;"><strong>${this.currentIssues.length} rows found</strong></p>
                </div>
                
                <div class="scrollable-table-container">
                    <table class="data-preview-table">
                        <thead>
                            <tr>
                                <th>Row #</th>
                                <th>Current Value</th>
                                <th>Suggested Fix</th>
                                ${action.type === 'ai-validation' || action.type === 'reference-validation' ? '<th>Reason</th>' : ''}
                                <th style="min-width: 250px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        this.currentIssues.forEach((issue, index) => {
            let buttonHtml;
            let rowBackground;
            
            if (action.type === 'duplicates') {
                // Check if we have a stored action for this duplicate value
                const dupValue = String(issue.currentValue);
                const storedAction = this.duplicateActions[dupValue];
                
                if (storedAction) {
                    // Show the action badge + Compare button
                    let badgeStyle = '';
                    if (storedAction.type === 'delete') {
                        badgeStyle = 'background: #dc3545; color: white;';
                        rowBackground = 'rgba(220, 53, 69, 0.2)';
                    } else if (storedAction.type === 'keep') {
                        badgeStyle = 'background: #28a745; color: white;';
                        rowBackground = 'rgba(40, 167, 69, 0.15)';
                    } else if (storedAction.type === 'edit') {
                        badgeStyle = 'background: #ffc107; color: #212529;';
                        rowBackground = 'rgba(255, 193, 7, 0.15)';
                    }
                    
                    buttonHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; ${badgeStyle}">
                                ${storedAction.label}
                            </span>
                            <button class="btn btn-sm btn-info" onclick="window.phase3View.showDuplicateModal('${this.escapeHtml(dupValue)}')">
                                Compare
                            </button>
                        </div>
                    `;
                } else {
                    // No action chosen yet - show just Compare button
                    buttonHtml = `
                        <button class="btn btn-sm btn-info" onclick="window.phase3View.showDuplicateModal('${this.escapeHtml(dupValue)}')">
                            Compare
                        </button>
                    `;
                    rowBackground = 'rgba(220, 53, 69, 0.1)';
                }
            } else if (action.type === 'reference-validation') {
                // Check status
                if (issue.status === 'kept') {
                    buttonHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: #28a745; font-weight: 600;">✓ KEPT</span>
                            <button class="btn btn-xs btn-secondary" onclick="window.phase3View.changeDecision(${index})">
                                Change Decision
                            </button>
                        </div>
                    `;
                    rowBackground = 'rgba(40, 167, 69, 0.15)';
                } else if (issue.status === 'rejected') {
                    buttonHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: #dc3545; font-weight: 600;">✗ REJECTED</span>
                            <button class="btn btn-xs btn-secondary" onclick="window.phase3View.changeDecision(${index})">
                                Change Decision
                            </button>
                        </div>
                    `;
                    rowBackground = 'rgba(220, 53, 69, 0.15)';
                } else if (issue.status === 'changed') {
                    buttonHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: #ffc107; font-weight: 600;">🔍 CHANGED</span>
                            <button class="btn btn-xs btn-secondary" onclick="window.phase3View.changeDecision(${index})">
                                Change Decision
                            </button>
                        </div>
                    `;
                    rowBackground = 'rgba(255, 193, 7, 0.15)';
                } else {
                    // Pending - show 3 buttons
                    buttonHtml = `
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn btn-xs btn-success" onclick="window.phase3View.keepReferenceValue(${index})" title="Keep this value">
                                ✓ Keep
                            </button>
                            <button class="btn btn-xs btn-danger" onclick="window.phase3View.rejectReferenceValue(${index})" title="Reject/delete this value">
                                ✗ Reject
                            </button>
                            <button class="btn btn-xs btn-warning" onclick="window.phase3View.showReferenceModal(${index})" title="Select a different value">
                                🔍 Change
                            </button>
                        </div>
                    `;
                    rowBackground = 'rgba(220, 53, 69, 0.1)';
                }
            } else {
                buttonHtml = `<button class="btn btn-sm btn-success" onclick="window.phase3View.fixSingleIssue(${index})">
                       Fix
                   </button>`;
                rowBackground = 'rgba(220, 53, 69, 0.1)';
            }
            
            html += `
                <tr style="background: ${rowBackground};">
                    <td><strong>${issue.rowNumber}</strong></td>
                    <td style="color: #dc3545; font-weight: bold;">${this.escapeHtml(String(issue.currentValue))}</td>
                    <td style="color: #28a745;">${this.escapeHtml(String(issue.suggestedFix))}</td>
                    ${action.type === 'ai-validation' || action.type === 'reference-validation' ? `<td style="font-size: 0.9em; color: #666;">${this.escapeHtml(issue.reason || '')}</td>` : ''}
                    <td>
                        ${buttonHtml}
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
        
        if (action.type === 'reference-validation') {
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">
                    ← Back to Actions
                </button>
                <button class="btn btn-info" disabled title="Review each row individually">
                    Manual Review Required
                </button>
            `;
        } else if (action.type === 'duplicates') {
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">
                    ← Back to Actions
                </button>
                <button class="btn btn-info" disabled title="Use Compare to review duplicates">
                    Review Duplicates Individually
                </button>
            `;
        } else {
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">
                    ← Back to Actions
                </button>
                <button class="btn btn-success" onclick="window.phase3View.fixAllIssues()">
                    Fix All ${this.currentIssues.length} Issues
                </button>
            `;
        }
    }

    // Keep reference value - mark as kept, track decision for Phase 4
    async keepReferenceValue(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        
        try {
            await fetch('/api/phase3/track-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: issue.rowNumber,
                    columnName: column.name,
                    action: 'kept',
                    originalValue: issue.originalValue || issue.currentValue,
                    newValue: issue.currentValue
                })
            });
            issue.status = 'kept';
            this.showQuickSuccess(`Row ${issue.rowNumber}: Value "${issue.currentValue}" kept`);
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        } catch (error) {
            console.error('Error tracking keep decision:', error);
            issue.status = 'kept';
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        }
    }

    // Reject reference value - update to empty, mark as rejected, track decision
    async rejectReferenceValue(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        
        if (!confirm(`Reject value "${issue.currentValue}" in row ${issue.rowNumber}?`)) {
            return;
        }
        
        try {
            await fetch('/api/phase3/track-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: issue.rowNumber,
                    columnName: column.name,
                    action: 'rejected',
                    originalValue: issue.originalValue || issue.currentValue,
                    newValue: ''
                })
            });
            
            const response = await fetch('/api/phase3/update-cell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowNumber: issue.rowNumber,
                    columnName: column.name,
                    newValue: ''
                })
            });
            
            if (!response.ok) throw new Error('Failed to update value');
            
            issue.currentValue = '';
            issue.status = 'rejected';
            
            this.showQuickSuccess(`Row ${issue.rowNumber}: Value rejected`);
            await this.loadRawData();
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
            
        } catch (error) {
            console.error('Error rejecting value:', error);
            alert('Error rejecting value: ' + error.message);
        }
    }

    // Change decision - reset status to pending, show 3 buttons again
    changeDecision(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        issue.status = 'pending';
        this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
    }

    async showDuplicateModal(duplicateValue) {
        const column = this.columns[this.currentColumnIndex];
        
        await window.duplicateModal.show(
            duplicateValue,
            column.name,
            this.columns,
            (rowActions, dupValue) => {
                // Determine the primary action for this duplicate value
                let primaryAction = null;
                let hasDelete = false;
                let hasEdit = false;
                let hasKeep = false;
                
                for (const rowNum in rowActions) {
                    const action = rowActions[rowNum];
                    if (action.action === 'delete') hasDelete = true;
                    if (action.action === 'edit') hasEdit = true;
                    if (action.action === 'keep') hasKeep = true;
                }
                
                // Priority: Delete > Edit > Keep
                if (hasDelete) {
                    primaryAction = { type: 'delete', label: '🗑️ Delete' };
                } else if (hasEdit) {
                    primaryAction = { type: 'edit', label: '✓ Edited' };
                } else if (hasKeep) {
                    primaryAction = { type: 'keep', label: '✓ Keep' };
                }
                
                if (primaryAction) {
                    this.duplicateActions[dupValue] = primaryAction;
                } else {
                    // No action was taken, remove any stored action
                    delete this.duplicateActions[dupValue];
                }
                
                // Refresh the issues panel to show updated action
                this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
            }
        );
    }

    async showReferenceModal(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        
        await window.referenceModal.show(
            issue,
            column.name,
            async (newValue) => {
                if (newValue) {
                    try {
                        await fetch('/api/phase3/track-decision', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                rowNumber: issue.rowNumber,
                                columnName: column.name,
                                action: 'changed',
                                originalValue: issue.originalValue || issue.currentValue,
                                newValue: newValue
                            })
                        });
                    } catch (error) {
                        console.error('Error tracking change decision:', error);
                    }
                    
                    issue.currentValue = newValue;
                    issue.status = 'changed';
                    await this.loadRawData();
                }
                this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
            }
        );
    }

    deselectAction() {
        this.currentActionIndex = -1;
        this.showActionsInLeftPanel();
        this.showWelcomeMessage();
    }

    async fixSingleIssue(issueIndex) {
        const savedActionIndex = this.currentActionIndex;
        
        if (savedActionIndex === -1 || !this.currentActions[savedActionIndex]) {
            console.error('No action selected');
            alert('Please select an action first');
            return;
        }
        
        const action = this.currentActions[savedActionIndex];
        const savedActionType = action.type;
        const column = this.columns[this.currentColumnIndex];
        const issue = this.currentIssues[issueIndex];
        
        console.log(`Fixing issue at row ${issue.rowNumber}`);
        
        try {
            const response = await fetch('/api/phase3/apply-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columnName: column.name,
                    actionType: savedActionType,
                    fixes: [issue]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            
            console.log(`✓ Fixed 1 issue`);
            
            this.currentIssues.splice(issueIndex, 1);
            action.cachedIssues = [...this.currentIssues];
            action.issueCount = this.currentIssues.length;
            
            await this.loadRawData();
            await this.generateActionsFromRules(column);
            
            const newActionIndex = this.currentActions.findIndex(a => a.type === savedActionType);
            if (newActionIndex !== -1) {
                this.currentActions[newActionIndex].cachedIssues = [...this.currentIssues];
                this.currentActions[newActionIndex].issueCount = this.currentIssues.length;
                this.currentActionIndex = newActionIndex;
                
                this.showActionsInLeftPanel();
                this.showIssuesInMiddlePanel(this.currentActions[newActionIndex]);
            } else {
                this.showActionsInLeftPanel();
                this.showWelcomeMessage();
            }
            
            this.showQuickSuccess('Fixed 1 issue!');
            
        } catch (error) {
            console.error('Error fixing issue:', error);
            alert('Error fixing issue: ' + error.message);
        }
    }

    async fixAllIssues() {
        const savedActionIndex = this.currentActionIndex;
        const action = this.currentActions[savedActionIndex];
        const column = this.columns[this.currentColumnIndex];
        
        if (!confirm(`Fix all ${this.currentIssues.length} issues for "${action.title}"?`)) {
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-message">
                <div class="loading-spinner"></div>
                <h2>Fixing Issues...</h2>
            </div>
        `;
        document.body.appendChild(overlay);
        
        try {
            const response = await fetch('/api/phase3/apply-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columnName: column.name,
                    actionType: action.type,
                    fixes: this.currentIssues
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to apply fixes');
            }
            
            const result = await response.json();
            overlay.remove();
            
            action.cachedIssues = [];
            action.issueCount = 0;
            
            await this.loadRawData();
            await this.showSuccessAnimation(`Fixed ${result.fixedCount} issues!`);
            
            await this.generateActionsFromRules(column);
            this.showActionsInLeftPanel();
            this.showWelcomeMessage();
            
        } catch (error) {
            overlay.remove();
            console.error('Error applying fixes:', error);
            alert('Error applying fixes: ' + error.message);
        }
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

    showQuickSuccess(message) {
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
            z-index: 10000;
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

    previousColumn() {
        console.log(`⬅️ previousColumn() called. Current: ${this.currentColumnIndex}`);
        if (this.currentColumnIndex > 0) {
            this.loadColumn(this.currentColumnIndex - 1);
        }
    }

    nextColumn() {
        console.log(`➡️ nextColumn() called. Current: ${this.currentColumnIndex}`);
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

// Token Tracker Class
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.phase3View = new Phase3ColumnView();
    window.phase3View.init();
});
