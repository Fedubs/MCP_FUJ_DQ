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
        this.duplicateActions = {};
        this.qualityScore = null;
    }

    async init() {
        console.log('Initializing Phase 3 Column View...');
        try {
            const config = await this.loadConfiguration();
            this.columns = config.columns;
            this.fileName = config.fileName;
            this.totalRecords = config.totalRecords;
            await this.loadRawData();
            await this.loadQualityScore();
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

    async loadQualityScore() {
        try {
            // First try to get existing score
            let response = await fetch('/api/phase3/quality-score');
            let result = await response.json();
            
            if (result.success && result.qualityScore !== null) {
                this.qualityScore = result.qualityScore;
                console.log('Loaded existing quality score:', this.qualityScore);
            } else {
                // Calculate if not yet done
                console.log('Calculating quality score...');
                response = await fetch('/api/phase3/calculate-quality-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                result = await response.json();
                if (result.success) {
                    this.qualityScore = result.qualityScore;
                    console.log('Calculated quality score:', this.qualityScore);
                }
            }
        } catch (error) {
            console.error('Error loading quality score:', error);
            this.qualityScore = null;
        }
    }

    async refreshQualityScore(columnName) {
        try {
            const response = await fetch('/api/phase3/recalculate-column', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnName })
            });
            const result = await response.json();
            if (result.success) {
                this.qualityScore = result.qualityScore;
                this.updateQualityScoreDisplay();
                console.log('Updated quality score:', this.qualityScore);
            }
        } catch (error) {
            console.error('Error refreshing quality score:', error);
        }
    }

    updateQualityScoreDisplay() {
        const scoreElement = document.getElementById('widgetQualityScore');
        if (scoreElement && this.qualityScore !== null) {
            scoreElement.innerHTML = `${this.qualityScore}<span style="font-size: 0.6em;">%</span>`;
            // Color based on score
            if (this.qualityScore >= 80) {
                scoreElement.style.color = '#28a745';
            } else if (this.qualityScore >= 60) {
                scoreElement.style.color = '#ffc107';
            } else {
                scoreElement.style.color = '#dc3545';
            }
        }
    }

    updateQualityWidget() {
        this.updateQualityScoreDisplay();
        document.getElementById('widgetTotalRecords').textContent = this.totalRecords.toLocaleString();
        document.getElementById('widgetColumnsProcessed').textContent = `0/${this.columns.length}`;
        document.getElementById('widgetFileName').textContent = this.fileName;
        document.getElementById('widgetCurrentColumn').textContent = '-';
    }

    initPanels() {
        document.getElementById('left-panel').innerHTML = `<div class="left-panel-header"><h2>Actions</h2><div class="subtitle">Click to view issues</div></div><div id="actions-list" class="actions-list"></div>`;
        document.getElementById('middle-panel').innerHTML = `
            <div class="middle-panel-header">
                <div class="column-navigation" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <button id="prev-column-btn" class="btn btn-sm btn-secondary">← Previous Column</button>
                    <span id="column-counter" style="font-weight: 500;">Column 1 of 10</span>
                    <button id="next-column-btn" class="btn btn-sm btn-secondary">Next Column →</button>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                    <h1 id="column-title" style="margin: 0;">Loading...</h1>
                    <span id="column-type-badge" class="column-type-badge">STRING</span>
                    <span id="column-subtype-badge" class="column-subtype-badge" style="display: none;"></span>
                </div>
            </div>
            <div class="middle-panel-content" id="middle-content"></div>
            <div class="middle-panel-footer" id="middle-footer"></div>`;
        this.initRightPanel();
        document.getElementById('prev-column-btn').addEventListener('click', () => this.previousColumn());
        document.getElementById('next-column-btn').addEventListener('click', () => this.nextColumn());
    }

    initRightPanel() {
        document.getElementById('right-panel').innerHTML = `
            <div class="right-panel-header"><h2>AI Token Consumption</h2><div class="subtitle">Only used for AI-powered fixes</div></div>
            <div class="token-panel-content">
                <div class="token-summary">
                    <div class="token-card"><div class="token-card-header"><span class="token-card-label">This Column</span></div><div class="token-card-value" id="column-tokens">0</div><div class="token-card-subtext">tokens</div></div>
                    <div class="token-card"><div class="token-card-header"><span class="token-card-label">Session Total</span></div><div class="token-card-value" id="session-tokens">0</div><div class="token-card-subtext">tokens this session</div></div>
                    <div class="token-card"><div class="token-card-header"><span class="token-card-label">Estimated Cost</span></div><div class="token-card-value" id="estimated-cost">$0.00</div><div class="token-card-subtext">of budget</div><div class="token-progress"><div class="token-progress-bar"><div class="token-progress-fill" id="token-progress-fill" style="width: 0%"></div></div></div></div>
                </div>
                <div class="token-history-section"><div class="token-history-header"><h3>Token History</h3></div><div class="token-history-list" id="token-history-list"><p style="color: #888; text-align: center; padding: 1rem;">No AI usage yet</p></div></div>
            </div>`;
    }

    async loadColumn(index) {
        this.currentColumnIndex = index;
        this.currentActionIndex = -1;
        const column = this.columns[index];
        this.duplicateActions = {};
        document.getElementById('widgetCurrentColumn').textContent = column.name;
        document.getElementById('widgetColumnsProcessed').textContent = `${index}/${this.columns.length}`;
        document.getElementById('column-title').textContent = column.name;
        document.getElementById('column-type-badge').textContent = column.type.toUpperCase();
        document.getElementById('column-counter').textContent = `Column ${index + 1} of ${this.columns.length}`;
        const subtypeBadge = document.getElementById('column-subtype-badge');
        if (subtypeBadge) {
            if (column.subtype) {
                subtypeBadge.textContent = column.subtype.toUpperCase().replace(/-/g, ' ');
                subtypeBadge.style.cssText = 'display: inline-block; background: #17a2b8; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;';
            } else subtypeBadge.style.display = 'none';
        }
        const prevBtn = document.getElementById('prev-column-btn');
        const nextBtn = document.getElementById('next-column-btn');
        prevBtn.disabled = (index === 0);
        if (index === this.columns.length - 1) {
            nextBtn.textContent = 'Go to Export →';
            nextBtn.className = 'btn btn-sm btn-success';
            nextBtn.onclick = () => window.location.href = '/phase4';
        } else {
            nextBtn.textContent = 'Next Column →';
            nextBtn.className = 'btn btn-sm btn-secondary';
            nextBtn.onclick = null;
        }
        await this.generateActionsFromRules(column);
        this.showActionsInLeftPanel();
        this.showWelcomeMessage();
        this.updateRightPanel();
    }

    async generateActionsFromRules(column) {
        try {
            const response = await fetch('/api/phase3/generate-actions-rules', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnName: column.name, columnType: column.type, stats: { totalRecords: column.totalRecords, emptyRecords: column.emptyRecords, duplicates: column.duplicates, isUniqueQualifier: column.isUniqueQualifier, isReferenceData: column.isReferenceData, subtype: column.subtype || '' } })
            });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            this.currentActions = (await response.json()).actions;
        } catch (error) { console.error('Error generating actions:', error); this.currentActions = []; }
    }

    showActionsInLeftPanel() {
        const actionsList = document.getElementById('actions-list');
        if (!this.currentActions || this.currentActions.length === 0) {
            actionsList.innerHTML = `<div style="padding: 2rem; text-align: center; color: #28a745;"><div style="font-size: 3rem;">✓</div><h3>No Issues Found!</h3></div>`;
            document.getElementById('middle-content').innerHTML = `<div style="padding: 3rem; text-align: center;"><div style="font-size: 4rem;">🎉</div><h2>Perfect Column!</h2></div>`;
            document.getElementById('middle-footer').innerHTML = '';
            return;
        }
        let html = '';
        this.currentActions.forEach((action, index) => {
            const isActive = index === this.currentActionIndex;
            const severityColor = action.severity === 'critical' ? '#dc3545' : action.severity === 'warning' ? '#ffc107' : '#17a2b8';
            html += `<div class="action-item ${isActive ? 'active' : ''}" onclick="window.phase3View.selectAction(${index}, true)" style="border-left: 3px solid ${severityColor};"><div class="action-icon">${this.getActionIcon(action.type)}</div><div class="action-content"><div class="action-title">${this.escapeHtml(action.title)}</div><div class="action-count">${action.issueCount > 0 ? action.issueCount + ' issues' : 'Click to scan'}</div></div><div class="action-arrow">→</div></div>`;
        });
        actionsList.innerHTML = html;
    }

    getActionIcon(actionType) {
        const icons = { 'duplicates': '🔄', 'empty': '📝', 'whitespace': '✂️', 'capitalization': '🔤', 'special-chars': '🔧', 'currency': '💰', 'commas': '📊', 'data-format-validation': '📋', 'reference-validation': '🔍', 'ai-validation': '🤖', 'city-normalization': '🏙️' };
        return icons[actionType] || '🔧';
    }

    showWelcomeMessage() {
        document.getElementById('middle-content').innerHTML = `<div style="padding: 3rem; text-align: center;"><div style="font-size: 3rem;">👈</div><h2>Select an Action</h2><p style="color: #888;">Click on an action in the left panel to view and fix issues.</p></div>`;
        document.getElementById('middle-footer').innerHTML = '';
    }

    async selectAction(actionIndex, forceRescan = true) {
        this.currentActionIndex = actionIndex;
        const action = this.currentActions[actionIndex];
        const column = this.columns[this.currentColumnIndex];
        this.showActionsInLeftPanel();
        if (!forceRescan && action.cachedIssues && action.cachedIssues.length > 0) {
            this.currentIssues = action.cachedIssues;
            action.issueCount = this.currentIssues.length;
            this.showActionsInLeftPanel();
            this.showIssuesInMiddlePanel(action);
            return;
        }
        document.getElementById('middle-content').innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Scanning for issues...</p></div>';
        try {
            await this.loadRawData();
            const requestBody = { columnName: column.name, columnType: column.type, actionType: action.type, columnData: this.rawData[column.name] };
            if (action.subtype) requestBody.subtype = action.subtype;
            else if (column.subtype) requestBody.subtype = column.subtype;
            const response = await fetch('/api/phase3/get-issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const result = await response.json();
            this.currentIssues = result.issues || [];
            this.currentIssues.forEach(issue => { issue.status = 'pending'; issue.originalValue = issue.currentValue; });
            action.cachedIssues = [...this.currentIssues];
            if (action.type === 'ai-validation' && result.tokensUsed) { this.tokenTracker.addUsage(column.name, result.tokensUsed); this.updateRightPanel(); }
            action.issueCount = this.currentIssues.length;
            this.showActionsInLeftPanel();
            this.showIssuesInMiddlePanel(action);
        } catch (error) { document.getElementById('middle-content').innerHTML = `<div class="error-message"><p>⚠️ Error loading issues</p><p style="font-size: 0.9em; color: #888;">${error.message}</p></div>`; }
    }

    showIssuesInMiddlePanel(action) {
        const content = document.getElementById('middle-content');
        const footer = document.getElementById('middle-footer');
        if (!this.currentIssues || this.currentIssues.length === 0) {
            content.innerHTML = `<div style="padding: 3rem; text-align: center;"><div style="font-size: 3rem;">✓</div><h2>No Issues Found</h2></div>`;
            footer.innerHTML = '';
            return;
        }
        const showReasonColumn = ['ai-validation', 'reference-validation', 'data-format-validation'].includes(action.type);
        const isDataFormatValidation = action.type === 'data-format-validation';
        
        let html = `<div class="section"><div class="section-header"><h3>${this.escapeHtml(action.title)}</h3><p style="color: #888; margin-top: 0.5rem;">${this.escapeHtml(action.description)}</p><p style="margin-top: 0.5rem;"><strong>${this.currentIssues.length} rows found</strong></p></div><div class="scrollable-table-container"><table class="data-preview-table"><thead><tr><th>Row #</th><th>Current Value</th><th>Suggested Fix</th>${showReasonColumn ? '<th>Reason</th>' : ''}<th>Action</th></tr></thead><tbody>`;
        
        this.currentIssues.forEach((issue, index) => {
            let buttonHtml, rowBackground;
            const severity = issue.severity || 'error';
            const isManualCheck = issue.suggestedFix === 'MANUAL_CHECK_REQUIRED';
            
            // Determine row background
            if (issue.status === 'edited') rowBackground = 'rgba(40, 167, 69, 0.15)';
            else if (issue.status === 'deleted') rowBackground = 'rgba(220, 53, 69, 0.2)';
            else if (severity === 'warning') rowBackground = 'rgba(255, 193, 7, 0.1)';
            else if (severity === 'info') rowBackground = 'rgba(23, 162, 184, 0.1)';
            else rowBackground = 'rgba(220, 53, 69, 0.1)';
            
            // Build action buttons based on action type
            if (action.type === 'duplicates') {
                const dupValue = String(issue.currentValue);
                const storedAction = this.duplicateActions[dupValue];
                if (storedAction) {
                    let badgeStyle = storedAction.type === 'delete' ? 'background: #dc3545; color: white;' : storedAction.type === 'keep' ? 'background: #28a745; color: white;' : 'background: #ffc107; color: #212529;';
                    if (storedAction.type === 'delete') rowBackground = 'rgba(220, 53, 69, 0.2)';
                    else if (storedAction.type === 'keep') rowBackground = 'rgba(40, 167, 69, 0.15)';
                    else rowBackground = 'rgba(255, 193, 7, 0.15)';
                    buttonHtml = `<div style="display: flex; align-items: center; gap: 0.5rem;"><span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; ${badgeStyle}">${storedAction.label}</span><button class="btn btn-sm btn-info" onclick="window.phase3View.showDuplicateModal('${this.escapeHtml(dupValue)}')">Compare</button></div>`;
                } else {
                    buttonHtml = `<button class="btn btn-sm btn-info" onclick="window.phase3View.showDuplicateModal('${this.escapeHtml(dupValue)}')">Compare</button>`;
                }
            } else if (action.type === 'reference-validation') {
                if (issue.status === 'kept') { buttonHtml = `<span style="color: #28a745; font-weight: 600;">✓ KEPT</span>`; rowBackground = 'rgba(40, 167, 69, 0.15)'; }
                else if (issue.status === 'rejected') { buttonHtml = `<span style="color: #dc3545; font-weight: 600;">✗ REJECTED</span>`; rowBackground = 'rgba(220, 53, 69, 0.15)'; }
                else buttonHtml = `<div style="display: flex; gap: 0.25rem;"><button class="btn btn-xs btn-success" onclick="window.phase3View.keepReferenceValue(${index})">✓ Keep</button><button class="btn btn-xs btn-danger" onclick="window.phase3View.rejectReferenceValue(${index})">✗ Reject</button><button class="btn btn-xs btn-warning" onclick="window.phase3View.showReferenceModal(${index})">🔍 Change</button></div>`;
            } else if (isDataFormatValidation) {
                // DATA FORMAT VALIDATION: Only Edit and Delete - NO Fix button
                if (issue.status === 'edited') {
                    buttonHtml = `<span style="color: #28a745; font-weight: 600;">✓ EDITED</span>`;
                } else if (issue.status === 'deleted') {
                    buttonHtml = `<span style="color: #dc3545; font-weight: 600;">🗑️ DELETED</span>`;
                } else {
                    // Always show Edit and Delete only for data-format-validation
                    buttonHtml = `<div style="display: flex; gap: 0.25rem; align-items: center;">
                        <button class="btn btn-xs btn-warning" onclick="window.phase3View.editManualValue(${index})" title="Edit manually">✏️ Edit</button>
                        <button class="btn btn-xs btn-danger" onclick="window.phase3View.deleteManualRow(${index})" title="Delete row">🗑️</button>
                    </div>`;
                }
            } else {
                // Other action types (whitespace, empty, etc.)
                if (issue.status === 'edited') buttonHtml = `<span style="color: #28a745; font-weight: 600;">✓ EDITED</span>`;
                else if (issue.status === 'deleted') buttonHtml = `<span style="color: #dc3545; font-weight: 600;">🗑️ DELETED</span>`;
                else if (isManualCheck) {
                    buttonHtml = `<div style="display: flex; gap: 0.25rem; align-items: center;"><span style="color: #ffc107; font-weight: 600; font-size: 0.85rem;">⚠️</span><button class="btn btn-xs btn-warning" onclick="window.phase3View.editManualValue(${index})">✏️ Edit</button><button class="btn btn-xs btn-danger" onclick="window.phase3View.deleteManualRow(${index})">🗑️ Delete</button></div>`;
                    rowBackground = 'rgba(255, 193, 7, 0.15)';
                } else if (severity === 'warning' && !issue.suggestedFix) {
                    buttonHtml = `<span style="color: #ffc107; font-weight: 600;">⚠️ Warning</span>`;
                } else {
                    buttonHtml = `<button class="btn btn-sm btn-success" onclick="window.phase3View.fixSingleIssue(${index})">Fix</button>`;
                }
            }
            
            const displayValue = issue.status === 'edited' ? issue.editedValue : issue.currentValue;
            const valueStyle = issue.status === 'edited' ? 'color: #28a745;' : (severity === 'warning' ? 'color: #856404;' : 'color: #dc3545;');
            html += `<tr style="background: ${rowBackground};" id="issue-row-${index}"><td><strong>${issue.rowNumber}</strong></td><td style="${valueStyle} font-weight: bold;" title="${this.escapeHtml(String(displayValue || ''))}">${this.escapeHtml(String(displayValue || ''))}</td><td style="color: #28a745;" title="${this.escapeHtml(String(issue.suggestedFix || '-'))}">${this.escapeHtml(String(issue.suggestedFix || '-'))}</td>${showReasonColumn ? `<td style="font-size: 0.9em; color: #666;" title="${this.escapeHtml(issue.reason || '')}">${this.escapeHtml(issue.reason || '')}</td>` : ''}<td>${buttonHtml}</td></tr>`;
        });
        
        html += `</tbody></table></div></div>`;
        content.innerHTML = html;
        
        // Footer - for data-format-validation, no "Fix All" button
        if (action.type === 'reference-validation' || action.type === 'duplicates' || action.type === 'data-format-validation') {
            footer.innerHTML = `<button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">← Back to Actions</button><button class="btn btn-info" disabled>Manual Review Required</button>`;
        } else {
            const fixableIssues = this.currentIssues.filter(i => i.suggestedFix && i.suggestedFix !== 'MANUAL_CHECK_REQUIRED' && i.severity !== 'warning' && i.status !== 'edited' && i.status !== 'deleted');
            footer.innerHTML = `<button class="btn btn-secondary" onclick="window.phase3View.deselectAction()">← Back to Actions</button><button class="btn btn-success" onclick="window.phase3View.fixAllIssues()" ${fixableIssues.length === 0 ? 'disabled' : ''}>Fix All ${fixableIssues.length} Auto-Fixable Issues</button>`;
        }
    }

    editManualValue(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        const action = this.currentActions[this.currentActionIndex];
        const subtype = action.subtype || column.subtype || null;
        
        window.editValueModal.show(issue, column.name, column.type, subtype, async (newValue) => {
            const response = await fetch('/api/phase3/update-cell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowNumber: issue.rowNumber, columnName: column.name, newValue: newValue })
            });
            if (!response.ok) throw new Error('Failed to update value');
            issue.editedValue = newValue;
            issue.currentValue = newValue;
            issue.status = 'edited';
            await this.loadRawData();
            await this.refreshQualityScore(column.name);
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        });
    }

    async deleteManualRow(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        if (!confirm(`Delete row ${issue.rowNumber} with value "${issue.currentValue}"?\n\nThis will mark the entire row for deletion in Phase 4 export.`)) return;
        try {
            const response = await fetch('/api/phase3/mark-row-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowNumber: issue.rowNumber, columnName: column.name, reason: 'manual-delete-format-validation' }) });
            if (!response.ok) throw new Error('Failed to mark row for deletion');
            issue.status = 'deleted';
            this.showQuickSuccess(`Row ${issue.rowNumber}: Marked for deletion`);
            await this.refreshQualityScore(column.name);
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        } catch (error) { alert('Error marking row for deletion: ' + error.message); }
    }

    async keepReferenceValue(issueIndex) { this.currentIssues[issueIndex].status = 'kept'; this.showQuickSuccess(`Row ${this.currentIssues[issueIndex].rowNumber}: Value kept`); this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]); }

    async rejectReferenceValue(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        if (!confirm(`Reject value "${issue.currentValue}" in row ${issue.rowNumber}?`)) return;
        try {
            await fetch('/api/phase3/update-cell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowNumber: issue.rowNumber, columnName: column.name, newValue: '' }) });
            issue.currentValue = ''; issue.status = 'rejected';
            this.showQuickSuccess(`Row ${issue.rowNumber}: Value rejected`);
            await this.loadRawData();
            await this.refreshQualityScore(column.name);
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        } catch (error) { alert('Error: ' + error.message); }
    }

    async showDuplicateModal(duplicateValue) {
        const column = this.columns[this.currentColumnIndex];
        await window.duplicateModal.show(duplicateValue, column.name, this.columns, async (rowActions, dupValue) => {
            let primaryAction = null;
            for (const rowNum in rowActions) {
                const action = rowActions[rowNum];
                if (action.action === 'delete') primaryAction = { type: 'delete', label: '🗑️ Delete' };
                else if (action.action === 'edit' && !primaryAction) primaryAction = { type: 'edit', label: '✓ Edited' };
                else if (action.action === 'keep' && !primaryAction) primaryAction = { type: 'keep', label: '✓ Keep' };
            }
            if (primaryAction) this.duplicateActions[dupValue] = primaryAction;
            else delete this.duplicateActions[dupValue];
            await this.refreshQualityScore(column.name);
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        });
    }

    async showReferenceModal(issueIndex) {
        const issue = this.currentIssues[issueIndex];
        const column = this.columns[this.currentColumnIndex];
        await window.referenceModal.show(issue, column.name, async (newValue) => {
            if (newValue) { issue.currentValue = newValue; issue.status = 'changed'; await this.loadRawData(); await this.refreshQualityScore(column.name); }
            this.showIssuesInMiddlePanel(this.currentActions[this.currentActionIndex]);
        });
    }

    deselectAction() { this.currentActionIndex = -1; this.showActionsInLeftPanel(); this.showWelcomeMessage(); }

    async fixSingleIssue(issueIndex) {
        const action = this.currentActions[this.currentActionIndex];
        const column = this.columns[this.currentColumnIndex];
        const issue = this.currentIssues[issueIndex];
        try {
            const requestBody = { columnName: column.name, actionType: action.type, columnType: column.type, fixes: [issue] };
            if (action.subtype) requestBody.subtype = action.subtype;
            else if (column.subtype) requestBody.subtype = column.subtype;
            const response = await fetch('/api/phase3/apply-fixes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) throw new Error('Failed to apply fix');
            this.currentIssues.splice(issueIndex, 1);
            action.cachedIssues = [...this.currentIssues];
            action.issueCount = this.currentIssues.length;
            await this.loadRawData();
            await this.refreshQualityScore(column.name);
            this.showActionsInLeftPanel();
            this.showIssuesInMiddlePanel(action);
            this.showQuickSuccess('Fixed 1 issue!');
        } catch (error) { alert('Error: ' + error.message); }
    }

    async fixAllIssues() {
        const action = this.currentActions[this.currentActionIndex];
        const column = this.columns[this.currentColumnIndex];
        const fixableIssues = this.currentIssues.filter(i => i.suggestedFix && i.suggestedFix !== 'MANUAL_CHECK_REQUIRED' && i.severity !== 'warning' && i.status !== 'edited' && i.status !== 'deleted');
        if (fixableIssues.length === 0) { alert('No automatically fixable issues found.'); return; }
        if (!confirm(`Fix all ${fixableIssues.length} auto-fixable issues?`)) return;
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `<div class="success-message"><div class="loading-spinner"></div><h2>Fixing Issues...</h2></div>`;
        document.body.appendChild(overlay);
        try {
            const requestBody = { columnName: column.name, actionType: action.type, columnType: column.type, fixes: fixableIssues };
            if (action.subtype) requestBody.subtype = action.subtype;
            else if (column.subtype) requestBody.subtype = column.subtype;
            const response = await fetch('/api/phase3/apply-fixes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) throw new Error('Failed to apply fixes');
            const result = await response.json();
            overlay.remove();
            this.currentIssues = this.currentIssues.filter(i => i.suggestedFix === 'MANUAL_CHECK_REQUIRED' || i.severity === 'warning' || i.status === 'edited' || i.status === 'deleted');
            action.cachedIssues = [...this.currentIssues];
            action.issueCount = this.currentIssues.length;
            await this.loadRawData();
            await this.refreshQualityScore(column.name);
            await this.showSuccessAnimation(`Fixed ${result.fixedCount} issues!`);
            this.showActionsInLeftPanel();
            this.showIssuesInMiddlePanel(action);
        } catch (error) { overlay.remove(); alert('Error: ' + error.message); }
    }

    async showSuccessAnimation(message) {
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `<div class="success-message"><div class="success-icon">✓</div><h2>${message}</h2></div>`;
        document.body.appendChild(overlay);
        await new Promise(resolve => setTimeout(resolve, 1200));
        overlay.remove();
    }

    showQuickSuccess(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 1rem 1.5rem; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; font-weight: 500;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
    }

    previousColumn() { if (this.currentColumnIndex > 0) this.loadColumn(this.currentColumnIndex - 1); }
    nextColumn() { if (this.currentColumnIndex < this.columns.length - 1) this.loadColumn(this.currentColumnIndex + 1); }

    updateRightPanel() {
        const column = this.columns[this.currentColumnIndex];
        document.getElementById('column-tokens').textContent = this.tokenTracker.getColumnTokens(column.name).toLocaleString();
        document.getElementById('session-tokens').textContent = this.tokenTracker.getSessionTotal().toLocaleString();
        document.getElementById('estimated-cost').textContent = `$${this.tokenTracker.getCurrentCost()}`;
        document.getElementById('token-progress-fill').style.width = `${Math.min(100, (this.tokenTracker.getSessionTotal() / 10000) * 100)}%`;
        const historyList = document.getElementById('token-history-list');
        const breakdown = this.tokenTracker.getBreakdown();
        if (breakdown.length === 0) historyList.innerHTML = '<p style="color: #888; text-align: center; padding: 1rem;">No AI usage yet</p>';
        else historyList.innerHTML = breakdown.map(item => `<div class="token-history-item"><div class="token-history-column">${this.escapeHtml(item.column)}</div><div class="token-history-meta"><span>${new Date(item.timestamp).toLocaleTimeString()}</span><span class="token-history-tokens">${item.tokens.toLocaleString()} tokens</span></div></div>`).join('');
    }

    escapeHtml(text) { if (text === null || text === undefined) return ''; const div = document.createElement('div'); div.textContent = String(text); return div.innerHTML; }
}

class TokenTracker {
    constructor() { this.sessionTokens = 0; this.columnTokens = {}; this.costPerToken = 0.000003; this.history = []; }
    addUsage(columnName, tokens) { this.sessionTokens += tokens; this.columnTokens[columnName] = (this.columnTokens[columnName] || 0) + tokens; this.history.push({ timestamp: Date.now(), column: columnName, tokens: tokens }); }
    getColumnTokens(columnName) { return this.columnTokens[columnName] || 0; }
    getSessionTotal() { return this.sessionTokens; }
    getCurrentCost() { return (this.sessionTokens * this.costPerToken).toFixed(4); }
    getBreakdown() { return this.history; }
}

document.addEventListener('DOMContentLoaded', () => { window.phase3View = new Phase3ColumnView(); window.phase3View.init(); });
