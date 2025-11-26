// Phase 3: Issue Detection - Find problematic rows for each action type
import express from 'express';

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
        const { columnName, actionType, columnData } = req.body;
        
        console.log('Finding', actionType, 'issues in column:', columnName);
        
        let issues = [];
        let tokensUsed = 0;
        
        // AI VALIDATION
        if (actionType === 'ai-validation') {
            const anthropic = req.app.locals.anthropic;
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
                console.error('AI validation error:', aiError);
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
                        // Empty value
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
                    
                    // Check if found in ServiceNow
                    if (validValues.has(excelValueLower)) {
                        // FOUND - Show as OK
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: excelValue,
                            suggestedFix: '✓ Valid',
                            reason: 'Found in ServiceNow'
                        });
                        return;
                    }
                    
                    // NOT FOUND - Find similar matches
                    let similarMatches = [];
                    for (const [snowValueLower, snowValue] of validValues.entries()) {
                        if (isSimilar(excelValueLower, snowValueLower, 3)) {
                            similarMatches.push(snowValue);
                            if (similarMatches.length >= 3) break; // Limit to 3 suggestions
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
                            suggestedFix: 'Delete (keep first occurrence in row ' + (indices[0] + 2) + ')'
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
                        suggestedFix: 'N/A or Unknown'
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
                            suggestedFix: '"' + trimmed + '"'
                        });
                    }
                }
            });
        }
        
        // CAPITALIZATION
        else if (actionType === 'capitalization') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value) {
                    const titleCase = value.toLowerCase().split(/\s+/).map(word => {
                        const lowercase = ['and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at'];
                        if (lowercase.includes(word)) return word;
                        return word.charAt(0).toUpperCase() + word.slice(1);
                    }).join(' ');
                    
                    if (titleCase !== value) {
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: value,
                            suggestedFix: titleCase
                        });
                    }
                }
            });
        }
        
        // SPECIAL CHARACTERS
        else if (actionType === 'special-chars') {
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value && /[^a-zA-Z0-9\s\-_.]/.test(value)) {
                    const cleaned = value.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: value,
                        suggestedFix: cleaned
                    });
                }
            });
        }
        
        // NAMING CONVENTION
        else if (actionType === 'naming-convention') {
            const patterns = {};
            columnData.forEach(value => {
                if (typeof value === 'string' && value) {
                    const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    if (normalized) patterns[normalized] = (patterns[normalized] || 0) + 1;
                }
            });
            
            const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
            
            columnData.forEach((value, index) => {
                if (typeof value === 'string' && value) {
                    const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    if (normalized !== value) {
                        let bestMatch = normalized;
                        for (const [pattern] of sortedPatterns) {
                            if (isSimilar(normalized, pattern, 2)) {
                                bestMatch = pattern;
                                break;
                            }
                        }
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: value,
                            suggestedFix: bestMatch
                        });
                    }
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
                            suggestedFix: correctName
                        });
                    }
                }
            });
        }
        
        // DATE FORMAT
        else if (actionType === 'date-format') {
            columnData.forEach((value, index) => {
                if (!value) return;
                try {
                    const original = String(value);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(original)) return;
                    
                    let date;
                    if (value instanceof Date) date = value;
                    else if (typeof value === 'string') date = new Date(value);
                    else if (typeof value === 'number') date = new Date((value - 25569) * 86400 * 1000);
                    
                    if (date && !isNaN(date.getTime())) {
                        const formatted = date.getFullYear() + '-' + 
                                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                                        String(date.getDate()).padStart(2, '0');
                        issues.push({
                            rowNumber: index + 2,
                            currentValue: original,
                            suggestedFix: formatted
                        });
                    }
                } catch (e) {}
            });
        }
        
        // INVALID DATES
        else if (actionType === 'invalid-dates') {
            columnData.forEach((value, index) => {
                if (!value) return;
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    issues.push({
                        rowNumber: index + 2,
                        currentValue: value,
                        suggestedFix: 'Remove or set to today'
                    });
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
                        suggestedFix: value.replace(/[$€£¥₹]/g, '').trim()
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
                        suggestedFix: value.replace(/,/g, '')
                    });
                }
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
