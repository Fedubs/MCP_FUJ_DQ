// Phase 3: Action Generation - Rule-based actions
import express from 'express';
import { 
    STRING_SUBTYPES, 
    NUMBER_SUBTYPES, 
    DATE_SUBTYPES, 
    BOOLEAN_SUBTYPES,
    autoDetectSubtype,
    getSubtypesForColumnType 
} from './data-format-validation.js';

const router = express.Router();

// POST /api/phase3/generate-actions-rules - Generate rule-based actions
router.post('/api/phase3/generate-actions-rules', (req, res) => {
    try {
        const { columnName, columnType, stats } = req.body;
        
        console.log('RULE-BASED action generation for:', columnName);
        console.log('Column type:', columnType, '| Subtype:', stats.subtype || '(none)');
        console.log('Stats:', JSON.stringify(stats));
        
        const actions = [];
        
        // Determine subtype - user-selected or auto-detected
        let effectiveSubtype = stats.subtype || autoDetectSubtype(columnName, columnType);
        let autoDetected = !stats.subtype && effectiveSubtype;
        
        if (autoDetected) {
            console.log(`   Auto-detected subtype: ${effectiveSubtype}`);
        }
        
        // RULE 1: DUPLICATES - Always show if there are any duplicates
        if (stats.duplicates > 0) {
            if (stats.isUniqueQualifier) {
                // CRITICAL - Unique Qualifier with Duplicates
                actions.push({
                    type: 'duplicates',
                    title: '⚠️ Remove Duplicates (CRITICAL)',
                    description: 'This column is marked as a unique qualifier but has ' + stats.duplicates + ' duplicate values.',
                    issueCount: stats.duplicates,
                    severity: 'critical'
                });
            } else {
                // Non-unique - still show but as warning/info
                const percentage = Math.round((stats.duplicates / stats.totalRecords) * 100);
                const severity = percentage > 10 ? 'warning' : 'info';
                actions.push({
                    type: 'duplicates',
                    title: '🔄 Review Duplicate Values',
                    description: `Found ${stats.duplicates} duplicate values (${percentage}% of records).`,
                    issueCount: stats.duplicates,
                    severity: severity
                });
            }
        }
        
        // RULE 2: Empty Values
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
        
        // ✅ UNIFIED: DATA FORMAT VALIDATION (for ALL column types)
        // Simple title, detailed description
        let formatValidationDesc = 'Check values match expected format, length, and pattern.';
        
        // Get specific description based on subtype or type
        if (effectiveSubtype) {
            let subtypeRules = null;
            let subtypeName = effectiveSubtype;
            
            if (STRING_SUBTYPES[effectiveSubtype]) {
                subtypeRules = STRING_SUBTYPES[effectiveSubtype];
                subtypeName = subtypeRules.name;
                formatValidationDesc = `Validate ${subtypeName} format (${subtypeRules.minLength}-${subtypeRules.maxLength} chars).`;
            } else if (NUMBER_SUBTYPES[effectiveSubtype]) {
                subtypeRules = NUMBER_SUBTYPES[effectiveSubtype];
                subtypeName = subtypeRules.name;
                if (subtypeRules.min !== null && subtypeRules.max !== null) {
                    formatValidationDesc = `Validate ${subtypeName} (${subtypeRules.min} to ${subtypeRules.max}, ${subtypeRules.decimals} decimals).`;
                } else {
                    formatValidationDesc = `Validate ${subtypeName} format (${subtypeRules.decimals} decimal places).`;
                }
            } else if (DATE_SUBTYPES[effectiveSubtype]) {
                subtypeRules = DATE_SUBTYPES[effectiveSubtype];
                subtypeName = subtypeRules.name;
                formatValidationDesc = `Validate ${subtypeName} format (${subtypeRules.format}).`;
            } else if (BOOLEAN_SUBTYPES[effectiveSubtype]) {
                subtypeRules = BOOLEAN_SUBTYPES[effectiveSubtype];
                subtypeName = subtypeRules.name;
                formatValidationDesc = `Normalize to ${subtypeRules.outputTrue}/${subtypeRules.outputFalse} format.`;
            }
            
            // Add auto-detected note to description
            if (autoDetected) {
                formatValidationDesc += ` (Auto-detected: ${subtypeName})`;
            }
        } else {
            // No subtype - use generic description based on column type
            switch (columnType) {
                case 'string':
                case 'alphanumeric':
                    formatValidationDesc = 'Check for consistent length, format, and naming patterns.';
                    break;
                case 'number':
                    formatValidationDesc = 'Validate numeric format, range, and check for negative values.';
                    break;
                case 'date':
                    formatValidationDesc = 'Validate date format and check for invalid dates.';
                    break;
                case 'boolean':
                    formatValidationDesc = 'Normalize boolean values to consistent format.';
                    break;
            }
        }
        
        actions.push({
            type: 'data-format-validation',
            subtype: effectiveSubtype || null,
            autoDetected: autoDetected,
            title: '📋 Data Format Validation',
            description: formatValidationDesc,
            issueCount: 0,
            severity: 'warning'
        });
        
        // TYPE-SPECIFIC ADDITIONAL RULES
        if (columnType === 'string' || columnType === 'alphanumeric') {
            actions.push({ 
                type: 'whitespace', 
                title: 'Trim Whitespace', 
                description: 'Remove leading/trailing spaces and collapse multiple spaces.', 
                issueCount: 0, 
                severity: 'info' 
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
            
            // City normalization for location-type columns
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
                severity: 'info' 
            });
            
            actions.push({ 
                type: 'commas', 
                title: 'Remove Commas', 
                description: 'Convert 1,234.56 to 1234.56.', 
                issueCount: 0, 
                severity: 'info' 
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
        
        console.log('Generated', actions.length, 'rule-based actions');
        
        res.json({ success: true, actions: actions });
        
    } catch (error) {
        console.error('Error generating rule-based actions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
