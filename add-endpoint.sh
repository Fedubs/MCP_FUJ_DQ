#!/bin/bash

# This script adds the rule-based endpoint to server.js

echo "Adding rule-based endpoint to server.js..."

# Create backup
cp server.js server.js.backup-$(date +%Y%m%d-%H%M%S)

# Find the line number where we need to insert
LINE_NUM=$(grep -n "app.post('/api/phase3/get-issues'" server.js | head -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
    echo "ERROR: Could not find insertion point in server.js"
    exit 1
fi

echo "Found insertion point at line $LINE_NUM"

# Insert the new endpoint before that line
head -n $((LINE_NUM - 1)) server.js > server.js.tmp

# Add the new endpoint
cat >> server.js.tmp << 'ENDPOINT_CODE'
// NEW: Phase 3 - Generate actions using RULES (NO AI - instant and free!)
app.post('/api/phase3/generate-actions-rules', (req, res) => {
    try {
        const { columnName, columnType, stats } = req.body;
        
        console.log(`\n📋 RULE-BASED action generation for: ${columnName}`);
        console.log(`   Type: ${columnType}, Empty: ${stats.emptyRecords}, Duplicates: ${stats.duplicates}`);
        console.log(`   Unique Qualifier: ${stats.isUniqueQualifier}, Reference Data: ${stats.isReferenceData}`);
        
        const actions = [];
        
        // ========== UNIVERSAL RULES (All Column Types) ==========
        
        // RULE 1: CRITICAL - Unique Qualifier with Duplicates
        if (stats.isUniqueQualifier && stats.duplicates > 0) {
            actions.push({
                type: 'duplicates',
                title: '⚠️ Remove Duplicates (CRITICAL)',
                description: `This column is marked as a unique qualifier but has ${stats.duplicates} duplicate values. Unique qualifiers MUST have zero duplicates.`,
                issueCount: stats.duplicates,
                severity: 'critical'
            });
        }
        // RULE 2: Non-Unique Qualifier with Many Duplicates
        else if (!stats.isUniqueQualifier && stats.duplicates > (stats.totalRecords * 0.1)) {
            actions.push({
                type: 'duplicates',
                title: 'Review Duplicate Values',
                description: `Found ${stats.duplicates} duplicate values (${Math.round((stats.duplicates / stats.totalRecords) * 100)}% of records). Review if this is expected.`,
                issueCount: stats.duplicates,
                severity: 'warning'
            });
        }
        
        // RULE 3: Empty Values (always check if > 0)
        if (stats.emptyRecords > 0) {
            const percentage = Math.round((stats.emptyRecords / stats.totalRecords) * 100);
            const severity = percentage > 20 ? 'critical' : (percentage > 5 ? 'warning' : 'info');
            actions.push({
                type: 'empty',
                title: `Fill ${stats.emptyRecords} Empty Values`,
                description: `${percentage}% of records are empty. Decide how to handle missing data.`,
                issueCount: stats.emptyRecords,
                severity: severity
            });
        }
        
        // RULE 4: Reference Data Validation
        if (stats.isReferenceData) {
            actions.push({
                type: 'reference-validation',
                title: 'Validate Against ServiceNow',
                description: 'Check if all values exist in corresponding ServiceNow reference table.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        // ========== TYPE-SPECIFIC RULES ==========
        
        if (columnType === 'string') {
            actions.push({
                type: 'whitespace',
                title: 'Trim Whitespace',
                description: 'Remove leading/trailing spaces.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'capitalization',
                title: 'Standardize Capitalization',
                description: 'Convert inconsistent casing to uniform format.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'special-chars',
                title: 'Remove Special Characters',
                description: 'Clean up trademark symbols and special characters.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'number') {
            actions.push({
                type: 'currency',
                title: 'Remove Currency Symbols',
                description: 'Strip $, €, £ from numeric values.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'commas',
                title: 'Remove Commas',
                description: 'Convert 1,234.56 to 1234.56.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'numeric-validation',
                title: 'Validate Numeric Format',
                description: 'Flag non-numeric values.',
                issueCount: 0,
                severity: 'critical'
            });
            
            actions.push({
                type: 'negative-values',
                title: 'Check Negative Values',
                description: 'Flag negative numbers if unexpected.',
                issueCount: 0,
                severity: 'warning'
            });
            
            actions.push({
                type: 'decimals',
                title: 'Standardize Decimal Places',
                description: 'Ensure consistent decimal precision.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'date') {
            actions.push({
                type: 'date-format',
                title: 'Standardize Date Format',
                description: 'Convert to YYYY-MM-DD format.',
                issueCount: 0,
                severity: 'critical'
            });
            
            actions.push({
                type: 'invalid-dates',
                title: 'Fix Invalid Dates',
                description: 'Flag impossible dates.',
                issueCount: 0,
                severity: 'critical'
            });
            
            actions.push({
                type: 'future-dates',
                title: 'Flag Future Dates',
                description: 'Identify dates in the future.',
                issueCount: 0,
                severity: 'warning'
            });
            
            actions.push({
                type: 'old-dates',
                title: 'Flag Historical Dates',
                description: 'Identify dates before 1990.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'text-dates',
                title: 'Convert Text Dates',
                description: 'Convert "Jan 15, 2024" to standard format.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'alphanumeric') {
            actions.push({
                type: 'case-format',
                title: 'Standardize Case Format',
                description: 'Convert to consistent uppercase/lowercase.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'separators',
                title: 'Standardize Separators',
                description: 'Make separators consistent.',
                issueCount: 0,
                severity: 'info'
            });
            
            actions.push({
                type: 'length-validation',
                title: 'Validate Length',
                description: 'Flag values that are too short/long.',
                issueCount: 0,
                severity: 'warning'
            });
        }
        
        else if (columnType === 'boolean') {
            actions.push({
                type: 'boolean-standardize',
                title: 'Standardize Boolean Values',
                description: 'Convert Yes/No, Y/N, 1/0 to true/false.',
                issueCount: 0,
                severity: 'critical'
            });
            
            actions.push({
                type: 'boolean-invalid',
                title: 'Fix Invalid Boolean Values',
                description: 'Flag invalid values like "Maybe", "Unknown".',
                issueCount: 0,
                severity: 'critical'
            });
        }
        
        console.log(`   ✓ Generated ${actions.length} rule-based actions (NO AI used!)`);
        
        res.json({
            success: true,
            actions: actions
        });
        
    } catch (error) {
        console.error('❌ Error generating rule-based actions:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

ENDPOINT_CODE

# Add the rest of the file
tail -n +$LINE_NUM server.js >> server.js.tmp

# Replace original with new version
mv server.js.tmp server.js

echo "✅ Successfully added rule-based endpoint to server.js"
echo "📝 Backup created: server.js.backup-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "Next steps:"
echo "1. Restart your server: node server.js"
echo "2. Refresh your browser"
echo "3. Navigate to Phase 3 and you should see actions in the left panel!"
