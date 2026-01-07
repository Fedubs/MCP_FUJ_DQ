// Phase 3: Issue Detection - Find problematic rows for each action type
import express from 'express';
import { 
    STRING_SUBTYPES,
    NUMBER_SUBTYPES,
    DATE_SUBTYPES,
    BOOLEAN_SUBTYPES,
    autoDetectSubtype,
    validateValue,
    generateFix
} from './data-format-validation.js';
import { smartCapitalize } from './capitalization-helpers.js';

const router = express.Router();

// Helper function for similarity checking (Levenshtein distance)
function isSimilar(str1, str2, threshold = 2) {
    if (str1 === str2) return true;
    if (Math.abs(str1.length - str2.length) > threshold) return false;
    
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length] <= threshold;
}

// POST /api/phase3/get-issues - Get problematic rows for specific action
router.post('/api/phase3/get-issues', async (req, res) => {
    try {
        const { columnName, actionType, columnData, subtype, columnType } = req.body;
        
        console.log('Finding', actionType, 'issues in column:', columnName, '| Type:', columnType, '| Subtype:', subtype || 'none');
        
        let issues = [];
        let tokensUsed = 0;
        
        // ✅ UNIFIED: DATA FORMAT VALIDATION
        if (actionType === 'data-format-validation') {
            // Determine effective subtype
            const effectiveSubtype = subtype || autoDetectSubtype(columnName, columnType);
            
            console.log(`Data Format Validation - Effective subtype: ${effectiveSubtype || 'basic'}`);
            
            // Get subtype rules for logging
            let subtypeName = 'basic validation';
            if (STRING_SUBTYPES[effectiveSubtype]) {
                subtypeName = STRING_SUBTYPES[effectiveSubtype].name;
            } else if (NUMBER_SUBTYPES[effectiveSubtype]) {
                subtypeName = NUMBER_SUBTYPES[effectiveSubtype].name;
            } else if (DATE_SUBTYPES[effectiveSubtype]) {
                subtypeName = DATE_SUBTYPES[effectiveSubtype].name;
            } else if (BOOLEAN_SUBTYPES[effectiveSubtype]) {
                subtypeName = BOOLEAN_SUBTYPES[effectiveSubtype].name;
            }
            
            console.log(`Validating against ${subtypeName} rules`);
            
            columnData.forEach((value, index) => {
                // Skip empty values (handled by 'empty' action)
                if (value === null || value === undefined || value === '') {
                    return;
                }
                
                const validation = validateValue(value, effectiveSubtype, columnType);
                
                // Skip if valid and no warning
                if (validation.valid && !validation.warning && !validation.needsNormalization) {
                    return;
                }
                
                // Has an issue or warning
                const suggestedFix = validation.needsNormalization 
                    ? validation.suggestedFix 
                    : generateFix(value, effectiveSubtype, columnType);
                
                issues.push({
                    rowNumber: index + 2,
                    currentValue: String(value),
                    suggestedFix: suggestedFix,
                    reason: validation.reason,
                    severity: validation.severity || (validation.warning ? 'warning' : 'error')
                });
            });
            
            console.log(`Found ${issues.length} data format validation issues`);
            
            return res.json({
                success: true,
                issues: issues.slice(0, 100)
            });
        }
        
        // AI VALIDATION
        if (actionType === 'ai-validation') {
            // Use lazy loader to get Anthropic client
            const getAnthropic = req.app.locals.getAnthropic;
            let anthropic = null;
            
            try {
                anthropic = getAnthropic ? await getAnthropic() : null;
            } catch (initError) {
                console.error('Error initializing Anthropic client:', initError.message);
            }
            
            if (!anthropic) {
                console.log('AI validation skipped - Anthropic API not configured');
                return res.json({
                    success: true,
                    issues: [],
                    tokensUsed: 0,
                    message: 'AI validation unavailable - ANTHROPIC_API_KEY not configured'
                });
            }
            
            const sampleSize = Math.min(50, columnData.length);
            const dataSample = columnData.slice(0, sampleSize);
            
            try {
                const prompt = `You are a data quality expert. Analyze this Excel column data and identify specific issues with suggested fixes.

Column: ${columnName}
Total Records: ${columnData.length}
Sample (first ${sampleSize} rows):

${dataSample.map((val, idx) => `Row ${idx + 2}: ${val === null || val === undefined || val === '' ? '(empty)' : JSON.stringify(val)}`).join('\n')}

Return ONLY valid JSON in this format:
{
  "issues": [
    {
      "rowNumber": 3,
      "currentValue": "example value",
      "suggestedFix": "corrected value",
      "reason": "Brief explanation"
    }
  ]
}

Limit to maximum 20 most important issues.`;

                const message = await anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 2048,
                    messages: [{ role: 'user', content: prompt }]
                });
                
                const responseText = message.content[0].text;
                tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
                
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    issues = parsed.issues || [];
                }
            } catch (aiError) {
                console.error('AI validation error:', aiError.message);
                tokensUsed = 0;
            }
            
            return res.json({ success: true, issues: issues.slice(0, 100), tokensUsed });
        }
        
        // REFERENCE VALIDATION - SERVICENOW (SHOW ALL ROWS)
        else if (actionType === 'reference-validation') {
            const credentials = req.app.locals.serviceNowCredentials;
            const config = req.app.locals.phase3Configuration;
            
            if (!credentials) {
                return res.json({
                    success: false,
                    error: 'No ServiceNow credentials found. Please connect in Phase 1.'
                });
            }
            
            const columnConfig = config.columns.find(col => col.name === columnName);
            if (!columnConfig || !columnConfig.serviceNowTable) {
                return res.json({
                    success: false,
                    error: 'No ServiceNow table configured for this column.'
                });
            }
            
            const snowTable = columnConfig.serviceNowTable;
            console.log(`Validating against ServiceNow table: ${snowTable}`);
            
            try {
                const axios = (await import('axios')).default;
                const baseUrl = `https://${credentials.instance}`;
                
                const response = await axios.get(`${baseUrl}/api/now/table/${snowTable}`, {
                    params: { sysparm_limit: 1000, sysparm_fields: 'name,sys_id' },
                    auth: { username: credentials.username, password: credentials.password },
                    timeout: 30000,
                    headers: { 'Accept': 'application/json' }
                });
                
                const snowRecords = response.data.result;
                console.log(`Fetched ${snowRecords.length} records from ServiceNow`);
                
                const validValues = new Map();
                snowRecords.forEach(record => {
                    const name = String(record.name || '').trim();
                    if (name) validValues.set(name.toLowerCase(), name);
                });
                
                // SHOW ALL ROWS (limit to 100 for performance)
                const rowsToCheck = columnData.slice(0, 100);
                
                rowsToCheck.forEach((value, index) => {
                    if (!value || value === '') {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: '(empty)',
                            suggestedFix: 'N/A',
                            reason: 'Empty value'
                        });
                        return;
                    }
                    
                    const excelValue = String(value).trim();
                    const excelValueLower = excelValue.toLowerCase();
                    
                    if (validValues.has(excelValueLower)) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: '✓ Valid',
                            reason: 'Found in ServiceNow'
                        });
                        return;
                    }
                    
                    let similarMatches = [];
                    for (const [snowValueLower, snowValue] of validValues.entries()) {
                        if (isSimilar(excelValueLower, snowValueLower, 3)) {
                            similarMatches.push(snowValue);
                            if (similarMatches.length >= 3) break;
                        }
                    }
                    
                    if (similarMatches.length > 0) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: similarMatches[0],
                            reason: `Not in ServiceNow. Similar: ${similarMatches.join(', ')}`
                        });
                    } else {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: 'MANUAL_CHECK_REQUIRED',
                            reason: 'Not found in ServiceNow and no similar matches'
                        });
                    }
                });
                
                console.log(`Validation complete: ${issues.length} rows checked`);
                
            } catch (snowError) {
                console.error('ServiceNow API error:', snowError.message);
                return res.json({
                    success: false,
                    error: `ServiceNow error: ${snowError.message}`
                });
            }
        }
        
        // DUPLICATES
        else if (actionType === 'duplicates') {
            const valueMap = {};
            columnData.forEach((value, index) => {
                const key = String(value || '');
                if (!valueMap[key]) valueMap[key] = [];
                valueMap[key].push(index);
            });
            
            Object.entries(valueMap).forEach(([value, indices]) => {
                if (indices.length > 1 && value !== '' && value !== 'null' && value !== 'undefined') {
                    indices.slice(1).forEach(rowIndex => {
                        issues.push({
                            rowNumber: rowIndex + 2,
                            currentValue: value,
                            suggestedFix: 'Delete (keep first occurrence in row ' + (indices[0] + 2) + ')',
                            reason: `Duplicate value. First occurrence in row ${indices[0] + 2}.`
                        });
                    });
                }
            });
        }
        
        // EMPTY
        else if (actionType === 'empty') {
            columnData.forEach((value, index) => {
                if (value === null || value === undefined || value === '') {
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: '(empty)',
                        suggestedFix: 'N/A or Unknown',
                        reason: 'Empty value needs to be filled or marked as N/A.'
                    });
                }
            });
        }
        
        // WHITESPACE
        else if (actionType === 'whitespace') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value) {
                    const trimmed = value.replace(/\s+/g, ' ').trim();
                    if (trimmed !== value) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: '"' + value + '"',
                            suggestedFix: '"' + trimmed + '"',
                            reason: 'Contains leading/trailing spaces or multiple consecutive spaces.'
                        });
                    }
                }
            });
        }
        
        // CAPITALIZATION - Using Smart Capitalization
        else if (actionType === 'capitalization') {
            console.log('🔤 Using Smart Capitalization with code detection...');
            
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value) {
                    const result = smartCapitalize(value);
                    
                    // Only add to issues if there's a change to suggest
                    if (!result.shouldSkip && result.suggestedFix !== value) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: value,
                            suggestedFix: result.suggestedFix,
                            reason: result.reason || 'Standardized capitalization'
                        });
                    }
                }
            });
            
            console.log(`🔤 Found ${issues.length} capitalization issues (skipped codes/acronyms/special cases)`);
        }
        
        // SPECIAL CHARACTERS
        else if (actionType === 'special-chars') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value && /[^a-zA-Z0-9\s\-_.]/.test(value)) {
                    const cleaned = value.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
                    const specialChars = value.match(/[^a-zA-Z0-9\s\-_.]/g);
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: value,
                        suggestedFix: cleaned,
                        reason: `Contains special characters: ${[...new Set(specialChars)].join(' ')}. These may cause issues in ServiceNow.`
                    });
                }
            });
        }
        
        // CITY NORMALIZATION
        else if (actionType === 'city-normalization') {
            const cityNormalizations = {
                'paris': 'Paris', 'parise': 'Paris', 'london': 'London',
                'sydney': 'Sydney', 'tokyo': 'Tokyo', 'singapore': 'Singapore',
                'hongkong': 'Hong Kong', 'losangeles': 'Los Angeles',
                'brisbane': 'Brisbane', 'melbourne': 'Melbourne', 'auckland': 'Auckland'
            };
            
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value) {
                    const normalized = value.toLowerCase().trim().replace(/\s+/g, '');
                    let correctName = cityNormalizations[normalized];
                    
                    if (!correctName) {
                        for (const [key, name] of Object.entries(cityNormalizations)) {
                            if (isSimilar(normalized, key, 2)) {
                                correctName = name;
                                break;
                            }
                        }
                    }
                    
                    if (correctName && correctName !== value) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: value,
                            suggestedFix: correctName,
                            reason: `City name variation detected. Standard name: ${correctName}`
                        });
                    }
                }
            });
        }
        
        // CURRENCY
        else if (actionType === 'currency') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && /[$€£¥₹]/.test(value)) {
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: value,
                        suggestedFix: value.replace(/[$€£¥₹]/g, '').trim(),
                        reason: 'Currency symbols should be removed for numeric fields in ServiceNow.'
                    });
                }
            });
        }
        
        // COMMAS
        else if (actionType === 'commas') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value.includes(',')) {
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: value,
                        suggestedFix: value.replace(/,/g, ''),
                        reason: 'Commas in numbers can cause import issues. Removing for numeric consistency.'
                    });
                }
            });
        }
        
        // Legacy support for old action type
        else if (actionType === 'subtype-validation') {
            // Redirect to data-format-validation
            return res.json({
                success: false,
                error: 'subtype-validation is deprecated. Use data-format-validation instead.'
            });
        }
        
        console.log('Found', issues.length, 'issues');
        
        res.json({
            success: true,
            issues: issues.slice(0, 100)
        });
        
    } catch (error) {
        console.error('Error getting issues:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
