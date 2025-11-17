## UPDATE YOUR server.js

Find the rule-based endpoint you just added and **ADD THIS** right after the type-specific rules and before the final `console.log`:

```javascript
        // ========== AI-POWERED ACTIONS (Manual Trigger) ==========
        
        // AI ACTION: Misspelling detection and value normalization (STRING columns only)
        if (columnType === 'string' || columnType === 'alphanumeric') {
            actions.push({
                type: 'ai-normalize',
                title: '🤖 Detect Misspellings & Normalize',
                description: 'Use AI to detect typos, standardize variations (e.g., "HP" → "Hewlett-Packard"), and normalize inconsistent values.',
                issueCount: 0, // Will be calculated when AI analyzes
                severity: 'info',
                requiresAI: true, // Flag to show "Use AI" button
                aiAction: true
            });
        }
        
        // AI ACTION: Reference data validation with suggestions
        if (stats.isReferenceData) {
            actions.push({
                type: 'ai-reference-validate',
                title: '🤖 AI-Powered Reference Validation',
                description: 'Use AI to match values against ServiceNow reference data and suggest corrections for non-matching entries.',
                issueCount: 0,
                severity: 'info',
                requiresAI: true,
                aiAction: true
            });
        }
```

**WHERE TO ADD IT:**

Find this line in the endpoint you just added:
```javascript
        console.log(`   ✓ Generated ${actions.length} rule-based actions`);
```

Add the AI-powered actions code RIGHT BEFORE that line.

---

Now update the frontend to show AI actions differently. Let me create the updated JavaScript file:
