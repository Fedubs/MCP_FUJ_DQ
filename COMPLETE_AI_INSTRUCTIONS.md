## COMPLETE INSTRUCTIONS TO ADD AI-POWERED ACTIONS

### STEP 1: Update server.js

Find the `/api/phase3/generate-actions-rules` endpoint you just added.

Find this line near the end:
```javascript
        console.log(`   ✓ Generated ${actions.length} rule-based actions`);
```

**Add this code RIGHT BEFORE that line:**

```javascript
        // ========== AI-POWERED ACTIONS (Manual Trigger) ==========
        
        // AI ACTION: Misspelling detection and value normalization
        if (columnType === 'string' || columnType === 'alphanumeric') {
            actions.push({
                type: 'ai-normalize',
                title: '🤖 Detect Misspellings & Normalize',
                description: 'Use AI to detect typos (e.g., "Micorsoft" → "Microsoft") and normalize variations (e.g., "HP" → "Hewlett-Packard").',
                issueCount: 0,
                severity: 'info',
                requiresAI: true,
                aiAction: true
            });
        }
        
        // AI ACTION: Smart reference validation
        if (stats.isReferenceData) {
            actions.push({
                type: 'ai-reference-validate',
                title: '🤖 AI Reference Validation',
                description: 'Use AI to match values against ServiceNow reference data and suggest intelligent corrections.',
                issueCount: 0,
                severity: 'info',
                requiresAI: true,
                aiAction: true
            });
        }
```

### STEP 2: Update shared/js/phase3-column.js

Find the `getActionIcon` method and add these two new icon mappings:

```javascript
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
            'ai-normalize': '🤖',              // NEW: Add this line
            'ai-reference-validate': '🤖'      // NEW: Add this line
        };
        return icons[actionType] || '🔧';
    }
```

### STEP 3: Update the showActionsInLeftPanel method

Find this section in `showActionsInLeftPanel`:

```javascript
            <div class="action-content">
                <div class="action-title">${this.escapeHtml(action.title)}</div>
                <div class="action-count">${action.issueCount > 0 ? action.issueCount + ' issues' : 'Click to scan'}</div>
            </div>
```

**Replace it with this:**

```javascript
            <div class="action-content">
                <div class="action-title">${this.escapeHtml(action.title)}</div>
                <div class="action-count">${action.aiAction ? '🤖 Use AI' : (action.issueCount > 0 ? action.issueCount + ' issues' : 'Click to scan')}</div>
            </div>
```

### STEP 4: Test it!

1. **Save both files** (server.js and phase3-column.js)
2. **Restart server:** `node server.js`
3. **Refresh browser**
4. **Go to Phase 3** → You should now see:
   - Regular actions with "Click to scan"
   - AI actions with "🤖 Use AI" label

---

## What This Does:

✅ **Adds two AI-powered actions:**
1. **🤖 Detect Misspellings & Normalize** (for STRING/ALPHANUMERIC columns)
2. **🤖 AI Reference Validation** (for Reference Data columns)

✅ **Shows them differently:**
- AI actions display "🤖 Use AI" instead of issue count
- When clicked, will call Claude API to analyze and suggest fixes

✅ **Cost control:**
- AI only used when user explicitly clicks
- Token usage tracked in right panel
- Free rule-based actions run first

---

**Ready to implement?** Just follow the 4 steps above! 🚀
