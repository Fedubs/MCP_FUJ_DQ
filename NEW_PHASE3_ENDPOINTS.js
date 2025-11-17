// ========================================
// ADD THESE TWO ENDPOINTS TO server.js
// Place them RIGHT BEFORE the "// ===== PHASE 4: EXPORT =====" line
// ========================================

// NEW: Phase 3 - Generate actions for a column (AI-powered)
app.post('/api/phase3/generate-actions', async (req, res) => {
    try {
        const { columnName, columnType, columnData, stats } = req.body;
        
        console.log(`\n🤖 Generating actions for column: ${columnName}`);
        console.log(`   Type: ${columnType}, Empty: ${stats.emptyRecords}, Duplicates: ${stats.duplicates}`);
        
        // Build prompt for Claude to generate action list
        const dataSample = columnData.slice(0, 20);
        
        const prompt = `You are a data quality expert. Analyze this column and determine what remediation actions are needed.

Column: ${columnName}
Type: ${columnType}
Total Records: ${stats.totalRecords}
Empty Records: ${stats.emptyRecords}
Duplicates: ${stats.duplicates}
Is Unique Qualifier: ${stats.isUniqueQualifier ? 'Yes' : 'No'}

Data Sample (first 20 values):
${dataSample.map((val, idx) => `${idx + 1}. ${val === null || val === undefined || val === '' ? '(empty)' : val}`).join('\n')}

Determine what data quality issues exist and return a JSON array of SPECIFIC actions needed:

{
  "actions": [
    {
      "type": "duplicates",
      "title": "Check Duplicates",
      "description": "Find and remove duplicate serial numbers",
      "issueCount": 374
    },
    {
      "type": "empty",
      "title": "Fill Empty Values",
      "description": "Handle 58 empty records",
      "issueCount": 58
    }
  ]
}

Action types: "duplicates", "empty", "misspelling", "format", "validation"

IMPORTANT: Only return actions where there ARE actual issues found in the data. If column is perfect, return empty actions array [].
Return ONLY valid JSON, no other text.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const responseText = message.content[0].text;
        const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
        
        console.log(`   ✓ Claude responded with ${tokensUsed} tokens`);
        
        // Parse JSON
        let actions = [];
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                actions = parsed.actions || [];
            }
        } catch (parseError) {
            console.error('   ✗ Failed to parse:', parseError);
        }
        
        console.log(`   📋 Generated ${actions.length} actions`);
        
        res.json({
            success: true,
            actions,
            tokensUsed
        });
        
    } catch (error) {
        console.error('❌ Error generating actions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// NEW: Phase 3 - Get problematic rows for a specific action
app.post('/api/phase3/get-issues', (req, res) => {
    try {
        const { columnName, actionType, columnData } = req.body;
        
        console.log(`\n🔍 Finding ${actionType} issues in column: ${columnName}`);
        
        let issues = [];
        
        if (actionType === 'duplicates') {
            // Find duplicates
            const valueMap = {};
            columnData.forEach((value, index) => {
                const key = String(value || '');
                if (!valueMap[key]) {
                    valueMap[key] = [];
                }
                valueMap[key].push(index);
            });
            
            // Get duplicates (values that appear more than once)
            Object.entries(valueMap).forEach(([value, indices]) => {
                if (indices.length > 1 && value !== '' && value !== 'null' && value !== 'undefined') {
                    // Add all occurrences except the first
                    indices.slice(1).forEach(rowIndex => {
                        issues.push({
                            rowNumber: rowIndex + 2, // +2 because Excel is 1-indexed and has header
                            currentValue: value,
                            suggestedFix: `Delete (keep first occurrence in row ${indices[0] + 2})`
                        });
                    });
                }
            });
        } 
        else if (actionType === 'empty') {
            // Find empty values
            columnData.forEach((value, index) => {
                if (value === null || value === undefined || value === '') {
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: '(empty)',
                        suggestedFix: 'Auto-generate value or mark for review'
                    });
                }
            });
        }
        else if (actionType === 'misspelling') {
            // Find potential misspellings (simplified example)
            // TODO: Implement proper spell checking with AI
            issues.push({
                rowNumber: 5,
                currentValue: 'Example misspelling',
                suggestedFix: 'Corrected spelling'
            });
        }
        else if (actionType === 'format') {
            // Find format inconsistencies
            // TODO: Implement format checking
        }
        else if (actionType === 'validation') {
            // Find validation errors
            // TODO: Implement validation checking
        }
        
        console.log(`   ✓ Found ${issues.length} issues`);
        
        res.json({
            success: true,
            issues: issues.slice(0, 100) // Limit to first 100 issues for performance
        });
        
    } catch (error) {
        console.error('❌ Error getting issues:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
