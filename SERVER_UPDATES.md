# SERVER.JS UPDATES FOR CLAUDE API INTEGRATION
# Add these changes to your existing server.js file

## 1. UPDATE IMPORTS (Lines 1-7)
Replace the import section with:

```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
```

## 2. ADD ANTHROPIC CLIENT (After line 15, after PORT declaration)
Add:

```javascript
// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});
```

## 3. UPDATE DATA STORAGE (Line 20-21)
Replace:
```javascript
let uploadedData = null;
let phase3Configuration = null;
```

With:
```javascript
let uploadedData = null;
let phase3Configuration = null;
let rawExcelData = {}; // Store actual column values for Phase 3
```

## 4. UPDATE PHASE 1 UPLOAD ENDPOINT
In the app.post('/api/phase1/upload') function, after the line:
```javascript
uploadedData = { ...
```

Add this line right after:
```javascript
// Store raw column data for Phase 3
rawExcelData = columnData;
```

## 5. ADD NEW API ENDPOINTS
Add these TWO new endpoints right after the line:
```javascript
app.get('/api/phase3/configuration', (req, res) => { ...
```

Add:

```javascript
// NEW: Get actual column data for Phase 3
app.get('/api/phase3/column-data/:columnName', (req, res) => {
    const columnName = decodeURIComponent(req.params.columnName);
    
    if (!rawExcelData || !rawExcelData[columnName]) {
        return res.status(404).json({ 
            error: 'Column data not found. Please upload a file in Phase 1 first.' 
        });
    }
    
    const values = rawExcelData[columnName];
    const preview = values.slice(0, 10);
    
    res.json({
        columnName,
        totalRecords: values.length,
        preview: preview.map((value, index) => ({
            row: index + 1,
            value: value || '(empty)'
        }))
    });
});

// NEW: Generate AI proposals using Claude API  
app.post('/api/phase3/generate-proposals', async (req, res) => {
    try {
        const { columnName, columnType, stats } = req.body;
        
        if (!rawExcelData || !rawExcelData[columnName]) {
            return res.status(404).json({ error: 'Column data not found' });
        }
        
        const values = rawExcelData[columnName];
        const sampleData = values.slice(0, 50);
        
        console.log(`Generating AI proposals for column: ${columnName}`);
        
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
                role: 'user',
                content: `You are a data quality expert. Analyze this column and suggest remediation actions.

Column Name: ${columnName}
Column Type: ${columnType}
Total Records: ${stats.totalRecords}
Empty Records: ${stats.emptyRecords}
Duplicates: ${stats.duplicates}

Sample Data (first 50 values):
${sampleData.map((v, i) => `${i + 1}. ${v || '(empty)'}`).join('\n')}

Provide 2-3 specific remediation proposals in JSON format:
{
  "proposals": [
    {
      "title": "Brief title",
      "description": "Detailed description of the issue and fix",
      "confidence": 85,
      "recordsAffected": 10,
      "expectedImprovement": 5
    }
  ]
}

Return ONLY valid JSON, no other text.`
            }]
        });
        
        const responseText = message.content[0].text;
        const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
        
        console.log(`Claude API response received. Tokens used: ${tokensUsed}`);
        
        let proposals;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                proposals = JSON.parse(jsonMatch[0]);
            } else {
                proposals = JSON.parse(responseText);
            }
        } catch (parseError) {
            console.error('Failed to parse Claude response:', responseText);
            throw new Error('Invalid response from AI');
        }
        
        res.json({
            proposals: proposals.proposals || [],
            tokensUsed
        });
        
    } catch (error) {
        console.error('Error generating proposals:', error);
        res.status(500).json({ 
            error: 'Failed to generate proposals: ' + error.message 
        });
    }
});
```

## DONE!
Save server.js and restart your server with: node server.js
