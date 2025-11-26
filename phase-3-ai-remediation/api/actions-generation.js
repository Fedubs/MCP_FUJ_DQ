// Phase 3: Action Generation - Rule-based actions
import express from 'express';

const router = express.Router();

// POST /api/phase3/generate-actions-rules - Generate rule-based actions
router.post('/api/phase3/generate-actions-rules', (req, res) => {
    try {
        const { columnName, columnType, stats } = req.body;
        
        console.log('RULE-BASED action generation for:', columnName);
        
        const actions = [];
        
        // RULE 1: CRITICAL - Unique Qualifier with Duplicates
        if (stats.isUniqueQualifier && stats.duplicates > 0) {
            actions.push({
                type: 'duplicates',
                title: '⚠️ Remove Duplicates (CRITICAL)',
                description: 'This column is marked as a unique qualifier but has ' + stats.duplicates + ' duplicate values.',
                issueCount: stats.duplicates,
                severity: 'critical'
            });
        }
        // RULE 2: Non-Unique Qualifier with Many Duplicates
        else if (!stats.isUniqueQualifier && stats.duplicates > (stats.totalRecords * 0.1)) {
            actions.push({
                type: 'duplicates',
                title: 'Review Duplicate Values',
                description: 'Found ' + stats.duplicates + ' duplicate values.',
                issueCount: stats.duplicates,
                severity: 'warning'
            });
        }
        
        // RULE 3: Empty Values
        if (stats.emptyRecords > 0) {
            const percentage = Math.round((stats.emptyRecords / stats.totalRecords) * 100);
            const severity = percentage > 20 ? 'critical' : (percentage > 5 ? 'warning' : 'info');
            actions.push({
                type: 'empty',
                title: 'Fill ' + stats.emptyRecords + ' Empty Values',
                description: percentage + '% of records are empty.',
                issueCount: stats.emptyRecords,
                severity: severity
            });
        }
        
        // TYPE-SPECIFIC RULES
        if (columnType === 'string') {
            actions.push({ 
                type: 'whitespace', 
                title: 'Trim Whitespace', 
                description: 'Remove leading/trailing spaces and collapse multiple spaces.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'capitalization', 
                title: 'Standardize Capitalization', 
                description: 'Convert to proper Title Case for consistency.', 
                issueCount: 0, 
                severity: 'info' 
            });
            
            actions.push({ 
                type: 'special-chars', 
                title: 'Remove Special Characters', 
                description: 'Clean special characters (keeping hyphens, underscores, periods).', 
                issueCount: 0, 
                severity: 'info' 
            });
            
            actions.push({
                type: 'naming-convention',
                title: 'Standardize Naming Convention',
                description: 'Normalize variations (e.g., ALKpRD → ALKPRD, ALPPROD → ALKPROD).',
                issueCount: 0,
                severity: 'warning'
            });
            
            if (columnName.toLowerCase().includes('city') || 
                columnName.toLowerCase().includes('location') ||
                columnName.toLowerCase().includes('site')) {
                actions.push({
                    type: 'city-normalization',
                    title: 'Normalize City Names',
                    description: 'Fix typos and standardize city names (e.g., paris/Parise → Paris).',
                    issueCount: 0,
                    severity: 'warning'
                });
            }
        }
        else if (columnType === 'number') {
            actions.push({ 
                type: 'currency', 
                title: 'Remove Currency Symbols', 
                description: 'Strip $, €, £ symbols from numbers.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'commas', 
                title: 'Remove Commas', 
                description: 'Convert 1,234.56 to 1234.56.', 
                issueCount: 0, 
                severity: 'warning' 
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
                description: 'Convert negative numbers to positive if needed.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'decimals', 
                title: 'Standardize Decimal Places', 
                description: 'Format all numbers to 2 decimal places.', 
                issueCount: 0, 
                severity: 'info' 
            });
        }
        else if (columnType === 'date') {
            actions.push({ 
                type: 'date-format', 
                title: 'Convert to ServiceNow Format (YYYY-MM-DD)', 
                description: 'Standardize all dates to YYYY-MM-DD format required by ServiceNow.', 
                issueCount: 0, 
                severity: 'critical' 
            });
            
            actions.push({ 
                type: 'invalid-dates', 
                title: 'Fix Invalid Dates', 
                description: 'Flag impossible or unparseable dates.', 
                issueCount: 0, 
                severity: 'critical' 
            });
            
            actions.push({ 
                type: 'future-dates', 
                title: 'Flag Future Dates', 
                description: 'Check for dates in the future.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'old-dates', 
                title: 'Flag Historical Dates', 
                description: 'Check dates before 1990.', 
                issueCount: 0, 
                severity: 'info' 
            });
        }
        else if (columnType === 'alphanumeric') {
            actions.push({ 
                type: 'whitespace', 
                title: 'Trim Whitespace', 
                description: 'Remove leading/trailing spaces and collapse multiple spaces.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'case-format', 
                title: 'Standardize Case Format', 
                description: 'Convert to consistent uppercase format.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({ 
                type: 'separators', 
                title: 'Standardize Separators', 
                description: 'Use consistent separators (hyphens).', 
                issueCount: 0, 
                severity: 'info' 
            });
            
            actions.push({ 
                type: 'length-validation', 
                title: 'Validate Length', 
                description: 'Check for unexpected lengths.', 
                issueCount: 0, 
                severity: 'warning' 
            });
            
            actions.push({
                type: 'naming-convention',
                title: 'Standardize Naming Convention',
                description: 'Normalize variations and ensure consistency.',
                issueCount: 0,
                severity: 'warning'
            });
        }
        else if (columnType === 'boolean') {
            actions.push({ 
                type: 'boolean-standardize', 
                title: 'Standardize Boolean Values', 
                description: 'Convert yes/no/1/0 to true/false.', 
                issueCount: 0, 
                severity: 'critical' 
            });
            
            actions.push({ 
                type: 'boolean-invalid', 
                title: 'Fix Invalid Boolean Values', 
                description: 'Flag values that are not boolean.', 
                issueCount: 0, 
                severity: 'critical' 
            });
        }
        
        // SERVICENOW REFERENCE VALIDATION - Second to last action (before AI)
        if (stats.isReferenceData) {
            actions.push({
                type: 'reference-validation',
                title: '🔍 ServiceNow Reference Validation',
                description: 'Check if values exist in ServiceNow CMDB and suggest matches.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        // AI VALIDATION - ALWAYS LAST ACTION (works for all column types)
        actions.push({
            type: 'ai-validation',
            title: '🤖 AI-Powered Smart Analysis',
            description: 'Let Claude AI analyze this column and suggest additional improvements that rule-based checks might miss.',
            issueCount: 0,
            severity: 'info'
        });
        
        console.log('Generated', actions.length, 'rule-based actions (including AI validation)');
        
        res.json({ success: true, actions: actions });
        
    } catch (error) {
        console.error('Error generating rule-based actions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
