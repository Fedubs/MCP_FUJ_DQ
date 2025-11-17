// ADD THIS NEW ENDPOINT RIGHT AFTER THE "/api/phase3/generate-actions" ENDPOINT

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
                description: `${percentage}% of records are empty. Decide how to handle missing data (default values, remove rows, or manual entry).`,
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
                issueCount: 0, // Will be calculated when clicked
                severity: 'info'
            });
        }
        
        // ========== TYPE-SPECIFIC RULES ==========
        
        if (columnType === 'string') {
            // STRING RULE 1: Trim whitespace
            actions.push({
                type: 'whitespace',
                title: 'Trim Whitespace',
                description: 'Remove leading/trailing spaces and normalize multiple spaces to single space.',
                issueCount: 0,
                severity: 'info'
            });
            
            // STRING RULE 2: Standardize capitalization
            actions.push({
                type: 'capitalization',
                title: 'Standardize Capitalization',
                description: 'Convert inconsistent casing to uniform format (e.g., "IBM" vs "ibm" vs "Ibm").',
                issueCount: 0,
                severity: 'info'
            });
            
            // STRING RULE 3: Remove special characters
            actions.push({
                type: 'special-chars',
                title: 'Remove Special Characters',
                description: 'Clean up trademark symbols, copyright symbols, and other special characters.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'number') {
            // NUMBER RULE 1: Remove currency symbols
            actions.push({
                type: 'currency',
                title: 'Remove Currency Symbols',
                description: 'Strip $, €, £, ¥ and other currency symbols from numeric values.',
                issueCount: 0,
                severity: 'info'
            });
            
            // NUMBER RULE 2: Remove commas
            actions.push({
                type: 'commas',
                title: 'Remove Commas',
                description: 'Convert formatted numbers (1,234.56) to plain numbers (1234.56).',
                issueCount: 0,
                severity: 'info'
            });
            
            // NUMBER RULE 3: Validate numeric format
            actions.push({
                type: 'numeric-validation',
                title: 'Validate Numeric Format',
                description: 'Flag non-numeric values like "abc", "N/A", or mixed text.',
                issueCount: 0,
                severity: 'critical'
            });
            
            // NUMBER RULE 4: Check for negative values
            actions.push({
                type: 'negative-values',
                title: 'Check Negative Values',
                description: 'Flag negative numbers if they should not exist (e.g., quantities, costs).',
                issueCount: 0,
                severity: 'warning'
            });
            
            // NUMBER RULE 5: Standardize decimal places
            actions.push({
                type: 'decimals',
                title: 'Standardize Decimal Places',
                description: 'Ensure consistent decimal precision (e.g., 10.5 vs 10.50 vs 10.500).',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'date') {
            // DATE RULE 1: Standardize date format
            actions.push({
                type: 'date-format',
                title: 'Standardize Date Format',
                description: 'Convert all dates to ISO format (YYYY-MM-DD) for consistency.',
                issueCount: 0,
                severity: 'critical'
            });
            
            // DATE RULE 2: Validate dates
            actions.push({
                type: 'invalid-dates',
                title: 'Fix Invalid Dates',
                description: 'Flag impossible dates like Feb 30th, month 13, or day 45.',
                issueCount: 0,
                severity: 'critical'
            });
            
            // DATE RULE 3: Flag future dates
            actions.push({
                type: 'future-dates',
                title: 'Flag Future Dates',
                description: 'Identify dates in the future that may be errors (e.g., install date in 2030).',
                issueCount: 0,
                severity: 'warning'
            });
            
            // DATE RULE 4: Flag very old dates
            actions.push({
                type: 'old-dates',
                title: 'Flag Historical Dates',
                description: 'Identify dates before 1990 that may be data entry errors.',
                issueCount: 0,
                severity: 'info'
            });
            
            // DATE RULE 5: Convert text dates
            actions.push({
                type: 'text-dates',
                title: 'Convert Text Dates',
                description: 'Convert text like "Jan 15, 2024" or "15-Jan-2024" to standard format.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        else if (columnType === 'alphanumeric') {
            // ALPHANUMERIC RULE 1: Standardize case
            actions.push({
                type: 'case-format',
                title: 'Standardize Case Format',
                description: 'Convert to consistent uppercase or lowercase (e.g., "SN-12345" vs "sn-12345").',
                issueCount: 0,
                severity: 'info'
            });
            
            // ALPHANUMERIC RULE 2: Fix separators
            actions.push({
                type: 'separators',
                title: 'Standardize Separators',
                description: 'Make separators consistent (dash vs underscore vs none: "SN-12345" vs "SN_12345" vs "SN12345").',
                issueCount: 0,
                severity: 'info'
            });
            
            // ALPHANUMERIC RULE 3: Validate length
            actions.push({
                type: 'length-validation',
                title: 'Validate Length',
                description: 'Flag values that are too short or too long for expected format.',
                issueCount: 0,
                severity: 'warning'
            });
        }
        
        else if (columnType === 'boolean') {
            // BOOLEAN RULE 1: Standardize format
            actions.push({
                type: 'boolean-standardize',
                title: 'Standardize Boolean Values',
                description: 'Convert Yes/No, Y/N, 1/0, TRUE/FALSE to consistent true/false format.',
                issueCount: 0,
                severity: 'critical'
            });
            
            // BOOLEAN RULE 2: Fix invalid values
            actions.push({
                type: 'boolean-invalid',
                title: 'Fix Invalid Boolean Values',
                description: 'Flag and fix invalid values like "Maybe", "Unknown", "N/A".',
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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
