import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// In-memory data storage (will be lost on server restart)
let uploadedData = null;
let phase3Configuration = null;
let rawExcelData = {};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to set correct MIME types
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.path.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

// Serve shared static files (CSS, JS)
app.use('/shared', express.static(join(__dirname, 'shared')));

// Serve phase folders as static (for documentation/assets only)
app.use('/phase-1-upload-profiling', express.static(join(__dirname, 'phase-1-upload-profiling')));
app.use('/phase-2-analysis', express.static(join(__dirname, 'phase-2-analysis')));
app.use('/phase-3-ai-remediation', express.static(join(__dirname, 'phase-3-ai-remediation')));
app.use('/phase-4-export', express.static(join(__dirname, 'phase-4-export')));

// Serve main index.html for all phase routes
app.get(['/', '/phase1', '/phase2', '/phase3', '/phase4'], (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// ===== PHASE 3 COLUMN DETAIL ROUTE ===== (Updated: Nov 16, 2025)
app.get('/phase3/column/:columnName', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Phase 3: Column Remediation - Excel Analyzer</title>
            <link rel="stylesheet" href="/shared/css/servicenow-style.css">
            <link rel="stylesheet" href="/shared/css/phase3-column.css">
        </head>
        <body>
            <!-- Header with Navigation -->
            <header class="sn-header">
                <div class="sn-header-content">
                    <div class="sn-logo">
                        <span class="logo-icon">📊</span>
                        <span>Excel Analyzer</span>
                    </div>
                    <nav class="sn-nav">
                        <a href="/phase1" class="nav-item">Phase 1: Upload</a>
                        <a href="/phase2" class="nav-item">Phase 2: Analysis</a>
                        <a href="/phase3" class="nav-item active">Phase 3: AI Remediation</a>
                        <a href="/phase4" class="nav-item">Phase 4: Export</a>
                    </nav>
                </div>
            </header>

            <div class="sn-main-container">
                <!-- Breadcrumb -->
                <div class="sn-breadcrumb">
                    <span class="breadcrumb-item">Home</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item active">Phase 3: AI Remediation</span>
                </div>

                <!-- Page Header -->
                <div class="sn-page-header">
                    <h1 class="page-title">AI-Powered Remediation</h1>
                    <div class="page-subtitle">Column-by-column data quality improvement</div>
                </div>

                <!-- Quality Score Widget -->
                <div class="quality-widget" id="qualityWidget">
                    <div class="quality-score-display">
                        <div class="score-value" id="widgetQualityScore">--<span style="font-size: 0.6em;">%</span></div>
                        <div class="score-label">Data Quality Score</div>
                    </div>
                    <div class="quality-details">
                        <div class="detail-item">
                            <div class="detail-value" id="widgetTotalRecords">0</div>
                            <div class="detail-label">Total Records</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-value" id="widgetColumnsProcessed">0/0</div>
                            <div class="detail-label">Columns Processed</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-value" id="widgetFileName">-</div>
                            <div class="detail-label">File Name</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-value" id="widgetCurrentColumn">-</div>
                            <div class="detail-label">Current Column</div>
                        </div>
                    </div>
                </div>

                <!-- Three Panel Layout -->
                <div class="three-panel-layout">
                    <div id="left-panel" class="left-panel"></div>
                    <div id="middle-panel" class="middle-panel"></div>
                    <div id="right-panel" class="right-panel"></div>
                </div>
            </div>
            
            <script type="module" src="/shared/js/phase3-column.js"></script>
        </body>
        </html>
    `;
    
    res.send(html);
});

// Helper function to detect column type
function detectColumnType(values) {
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonEmptyValues.length === 0) return 'string';
    
    // Check if all are numbers
    const numericCount = nonEmptyValues.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    if (numericCount / nonEmptyValues.length > 0.8) return 'number';
    
    // Check if all are dates
    const dateCount = nonEmptyValues.filter(v => {
        if (v instanceof Date) return true;
        const parsed = new Date(v);
        return !isNaN(parsed.getTime());
    }).length;
    if (dateCount / nonEmptyValues.length > 0.8) return 'date';
    
    // Check if alphanumeric (mix of letters and numbers, like serial numbers)
    const alphanumericCount = nonEmptyValues.filter(v => {
        const str = String(v);
        return /^[a-zA-Z0-9]+$/.test(str) && /[a-zA-Z]/.test(str) && /[0-9]/.test(str);
    }).length;
    if (alphanumericCount / nonEmptyValues.length > 0.5) return 'alphanumeric';
    
    return 'string';
}

// Helper function to profile a column
function profileColumn(columnName, values) {
    const totalRecords = values.length;
    const emptyRecords = values.filter(v => v === null || v === undefined || v === '').length;
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    // Count unique values
    const uniqueValues = new Set(nonEmptyValues.map(v => String(v))).size;
    
    // Count duplicates
    const valueCountMap = {};
    nonEmptyValues.forEach(v => {
        const key = String(v);
        valueCountMap[key] = (valueCountMap[key] || 0) + 1;
    });
    const duplicates = Object.values(valueCountMap).filter(count => count > 1).reduce((sum, count) => sum + count, 0);
    
    return {
        name: columnName,
        type: detectColumnType(values),
        totalRecords,
        emptyRecords,
        duplicates,
        uniqueValues,
        isUniqueQualifier: false,
        isReferenceData: false
    };
}

// ===== PHASE 1: UPLOAD & PROFILING =====
app.get('/api/phase1/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">Upload & Data Profiling</h1>
            <div class="page-subtitle">Upload your Excel file to begin analysis</div>
        </div>

        <div class="sn-content">
            <!-- Left Panel - Upload Form -->
            <div class="sn-panel">
                <div class="panel-header">
                    <h2 class="panel-title">File Upload</h2>
                </div>
                <div class="panel-body">
                    <div class="upload-container">
                        <div id="dropZone" class="drop-zone">
                            <div class="drop-zone-icon">📁</div>
                            <div class="drop-zone-text">
                                <strong>Drop your Excel file here</strong>
                                <span>or click to browse</span>
                            </div>
                            <input type="file" id="fileInput" accept=".xlsx,.xls" style="display: none;">
                            <button class="sn-btn-primary" onclick="document.getElementById('fileInput').click()">
                                Choose File
                            </button>
                        </div>

                        <div id="fileInfo" class="file-info" style="display: none;">
                            <div class="file-info-header">
                                <span class="file-icon">📄</span>
                                <span id="fileName" class="file-name"></span>
                                <button class="btn-remove" onclick="Phase1.removeFile()">✕</button>
                            </div>
                            <div class="file-details">
                                <span id="fileSize" class="file-size"></span>
                                <span class="file-type">Excel Spreadsheet</span>
                            </div>
                        </div>

                        <div id="progressContainer" class="progress-container" style="display: none;">
                            <div class="progress-label">
                                <span>Uploading and analyzing...</span>
                                <span id="progressPercent">0%</span>
                            </div>
                            <div class="progress-bar">
                                <div id="progressFill" class="progress-fill"></div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button id="uploadBtn" class="sn-btn-primary" disabled onclick="Phase1.startUpload()">
                                Upload & Analyze
                            </button>
                            <button class="sn-btn-secondary" onclick="Phase1.resetForm()">
                                Cancel
                            </button>
                        </div>
                    </div>

                    <div class="info-box">
                        <div class="info-box-header">
                            <span class="info-icon">ℹ️</span>
                            <strong>Supported Formats</strong>
                        </div>
                        <ul class="info-list">
                            <li>.xlsx (Excel 2007+)</li>
                            <li>.xls (Excel 97-2003)</li>
                            <li>Maximum file size: 50 MB</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Right Panel - Instructions -->
            <div class="sn-panel sn-panel-info">
                <div class="panel-header">
                    <h2 class="panel-title">What Happens Next?</h2>
                </div>
                <div class="panel-body">
                    <div class="process-steps-vertical">
                        <div class="process-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h3>Data Extraction</h3>
                                <p>We'll parse your Excel file and extract all data while preserving structure.</p>
                            </div>
                        </div>
                        <div class="process-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h3>Data Profiling</h3>
                                <p>Analyze column types, patterns, null values, duplicates, and data distributions.</p>
                            </div>
                        </div>
                        <div class="process-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h3>Quality Score</h3>
                                <p>Calculate initial data quality score based on completeness, consistency, and validity.</p>
                            </div>
                        </div>
                        <div class="process-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h3>Review Results</h3>
                                <p>View comprehensive profiling report and proceed to Phase 2 for deeper analysis.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="/shared/js/app.js"></script>
        <script src="/shared/js/phase1.js"></script>
    `);
});

// Phase 1 upload endpoint - WITH REAL EXCEL PARSING
app.post('/api/phase1/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File received:', req.file.originalname);

        // Read the Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        
        // Extract column headers (first row)
        const headerRow = worksheet.getRow(1);
        const columns = [];
        const columnData = {};
        
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const columnName = String(cell.value || `Column ${colNumber}`);
            columns.push(columnName);
            columnData[columnName] = [];
        });
        
        // Extract all data rows (skip header)
        let totalRows = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            
            totalRows++;
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const columnName = columns[colNumber - 1];
                if (columnName) {
                    columnData[columnName].push(cell.value);
                }
            });
        });
        
        // Profile each column
        const profiledColumns = columns.map(columnName => 
            profileColumn(columnName, columnData[columnName])
        );
        
        // Calculate quality score based on completeness
        const totalCells = totalRows * columns.length;
        const emptyCells = profiledColumns.reduce((sum, col) => sum + col.emptyRecords, 0);
        const dataQualityScore = Math.round(((totalCells - emptyCells) / totalCells) * 100);
        
        // Store data in memory for Phase 2
        uploadedData = {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            totalRecords: totalRows,
            totalColumns: columns.length,
            columns: profiledColumns,
            dataQualityScore
        };
        
        // Store raw column data for Phase 3
        rawExcelData = columnData;

        console.log(`Parsed: ${totalRows} rows, ${columns.length} columns`);
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        res.json({
            success: true,
            message: 'File uploaded and analyzed successfully',
            data: {
                fileName: req.file.originalname,
                totalRecords: totalRows,
                totalColumns: columns.length,
                dataQualityScore
            }
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Upload failed: ' + error.message 
        });
    }
});

// ===== PHASE 2: ANALYSIS =====
app.get('/api/phase2/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">Column Analysis & Configuration</h1>
            <div class="page-subtitle">Review and configure column settings</div>
        </div>

        <!-- Quality Score Widget - Full Width at Top -->
        <div class="quality-widget">
            <div class="quality-score-display">
                <div class="score-value" id="widgetQualityScore">100<span style="font-size: 0.6em;">%</span></div>
                <div class="score-label">Data Quality Score</div>
            </div>
            <div class="quality-details">
                <div class="detail-item">
                    <div class="detail-value" id="widgetTotalRecords">0</div>
                    <div class="detail-label">Total Records</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetTotalColumns">0</div>
                    <div class="detail-label">Total Columns</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetFileName">-</div>
                    <div class="detail-label">File Name</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetFileSize">-</div>
                    <div class="detail-label">File Size</div>
                </div>
            </div>
        </div>

        <!-- Column Cards Grid -->
        <div class="sn-panel" style="margin-bottom: 2rem;">
            <div class="panel-header">
                <h2 class="panel-title">Column Configuration</h2>
            </div>
            <div class="panel-body">
                <div id="columnsContainer" class="columns-grid">
                    <!-- Column cards will be loaded here by phase2.js -->
                </div>
            </div>
        </div>

        <!-- Save Configuration -->
        <div class="sn-panel">
            <div class="panel-header">
                <h2 class="panel-title">Save Configuration</h2>
            </div>
            <div class="panel-body">
                <div class="config-input-group">
                    <div class="form-group">
                        <label class="form-label" for="configName">Configuration Name (Optional)</label>
                        <input type="text" 
                               id="configName" 
                               class="form-input" 
                               placeholder="e.g., Hardware Assets Config">
                        <small style="color: #888; display: block; margin-top: 0.5rem;">
                            Save with a name to reuse this configuration later
                        </small>
                    </div>
                    <button id="saveConfigBtn" class="sn-btn-primary">
                        Save Configuration
                    </button>
                </div>
                <div class="form-actions" style="margin-top: 1rem;">
                    <button id="continuePhase3Btn" class="sn-btn-secondary">
                        Continue to Phase 3 →
                    </button>
                </div>
            </div>
        </div>
        
        <script src="/shared/js/app.js"></script>
        <script src="/shared/js/phase2.js"></script>
    `);
});

// Phase 2 - Get column data
app.get('/api/phase2/columns', (req, res) => {
    if (!uploadedData) {
        return res.status(404).json({ 
            error: 'No file uploaded. Please upload a file in Phase 1 first.' 
        });
    }
    
    res.json(uploadedData);
});

// NEW: Phase 2 - Auto-save configuration for Phase 3
app.post('/api/phase2/auto-save-for-phase3', (req, res) => {
    try {
        phase3Configuration = req.body;
        console.log('Configuration auto-saved for Phase 3:', {
            fileName: phase3Configuration.fileName,
            columns: phase3Configuration.columns.length,
            dataQualityScore: phase3Configuration.dataQualityScore
        });
        
        res.json({
            success: true,
            message: 'Configuration saved for Phase 3'
        });
    } catch (error) {
        console.error('Error saving configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save configuration'
        });
    }
});

// ===== PHASE 3: AI REMEDIATION =====
app.get('/api/phase3/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">AI-Powered Remediation</h1>
            <div class="page-subtitle">Intelligent data cleaning and normalization</div>
        </div>

        <!-- Quality Score Widget - Persistent -->
        <div class="quality-widget">
            <div class="quality-score-display">
                <div class="score-value" id="widgetQualityScore">--<span style="font-size: 0.6em;">%</span></div>
                <div class="score-label">Data Quality Score</div>
            </div>
            <div class="quality-details">
                <div class="detail-item">
                    <div class="detail-value" id="widgetTotalRecords">0</div>
                    <div class="detail-label">Total Records</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetColumnsToRemediate">0</div>
                    <div class="detail-label">Columns to Remediate</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetFileName">-</div>
                    <div class="detail-label">File Name</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetProgress">0/0</div>
                    <div class="detail-label">Progress</div>
                </div>
            </div>
        </div>

        <!-- Phase 3 Explanation -->
        <div class="sn-panel">
            <div class="panel-header">
                <h2 class="panel-title">📋 How Phase 3 Works</h2>
            </div>
            <div class="panel-body">
                <div class="process-steps-horizontal">
                    <div class="process-step">
                        <div class="step-number">3.1</div>
                        <div class="step-content">
                            <h3>Column-by-Column Remediation</h3>
                            <p>We'll guide you through each column one at a time, showing all data quality issues that need attention.</p>
                        </div>
                    </div>
                    <div class="process-step">
                        <div class="step-number">3.2</div>
                        <div class="step-content">
                            <h3>Type-Specific Actions</h3>
                            <p>Each column type (String, Number, Date, etc.) has its own specialized remediation actions tailored to common issues.</p>
                        </div>
                    </div>
                    <div class="process-step">
                        <div class="step-number">3.3</div>
                        <div class="step-content">
                            <h3>Real-Time Quality Updates</h3>
                            <p>Watch your data quality score improve in real-time as you fix issues and clean your data.</p>
                        </div>
                    </div>
                    <div class="process-step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h3>Review & Export</h3>
                            <p>Once complete, review your cleaned data and export it in Phase 4.</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(0, 255, 65, 0.1); border: 1px solid #28a745; border-radius: 4px;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <span style="font-size: 2rem;">🎯</span>
                        <div>
                            <h3 style="margin: 0; color: #74a290ff;">Your Columns</h3>
                            <p style="margin: 0.5rem 0 0 0; color: #ccc;">
                                You have <strong id="columnsCount">--</strong> columns to review. 
                                We'll start with the first column and work through them one by one.
                            </p>
                        </div>
                    </div>
                    <div id="columnsList" style="margin-top: 1rem;">
                        <!-- Columns list will be loaded here -->
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 2rem;">
                    <button id="beginRemediationBtn" class="sn-btn-primary" style="font-size: 1.1rem; padding: 1rem 2rem;">
                        Begin Remediation →
                    </button>
                </div>
            </div>
        </div>
        
        <script src="/shared/js/app.js"></script>
        <script src="/shared/js/phase3.js"></script>
    `);
});

// NEW: Phase 3 - Get configuration
app.get('/api/phase3/configuration', (req, res) => {
    if (!phase3Configuration) {
        return res.status(404).json({ 
            error: 'No configuration available. Please complete Phase 2 first.' 
        });
    }
    
    res.json(phase3Configuration);
});

// NEW: Phase 3 - Get raw Excel data
app.get('/api/phase3/raw-data', (req, res) => {
    if (!rawExcelData || Object.keys(rawExcelData).length === 0) {
        return res.status(404).json({ 
            error: 'No raw data available. Please upload a file in Phase 1 first.' 
        });
    }
    
    console.log('Sending raw data with columns:', Object.keys(rawExcelData));
    res.json(rawExcelData);
});

// NEW: Phase 3 - Remediate column using Claude API
app.post('/api/phase3/remediate-column', async (req, res) => {
    try {
        const { columnName, columnType, columnData, stats } = req.body;
        
        console.log(`\n🤖 Claude API Request for column: ${columnName}`);
        console.log(`   Type: ${columnType}, Records: ${stats.totalRecords}`);
        
        // Prepare data sample (first 20 values)
        const dataSample = columnData.slice(0, 20);
        
        // Build prompt for Claude
        const prompt = `You are a data quality expert. Analyze this Excel column and suggest remediation actions.

Column Name: ${columnName}
Column Type: ${columnType}
Total Records: ${stats.totalRecords}
Empty Records: ${stats.emptyRecords}
Duplicates: ${stats.duplicates}

Data Sample (first 20 values):
${dataSample.map((val, idx) => `${idx + 1}. ${val === null || val === undefined || val === '' ? '(empty)' : val}`).join('\n')}

Please analyze this column and provide 2-3 specific remediation proposals in JSON format:
{
  "proposals": [
    {
      "title": "Short title for the action",
      "description": "Detailed description of what will be done",
      "confidence": 85,
      "recordsAffected": 10,
      "expectedImprovement": 5
    }
  ]
}

Focus on:
1. Handling empty/null values
2. Standardizing formats
3. Removing duplicates if appropriate
4. Data type validation

Return ONLY valid JSON, no other text.`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });
        
        // Extract response
        const responseText = message.content[0].text;
        const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
        
        console.log(`   ✓ Claude responded with ${tokensUsed} tokens`);
        
        // Parse JSON response
        let proposals = [];
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                proposals = parsed.proposals || [];
            }
        } catch (parseError) {
            console.error('   ✗ Failed to parse Claude response:', parseError);
            // Fallback to empty proposals
            proposals = [];
        }
        
        res.json({
            success: true,
            columnName,
            proposals,
            tokensUsed,
            rawResponse: responseText
        });
        
    } catch (error) {
        console.error('❌ Claude API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate proposals: ' + error.message
        });
    }
});


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

// NEW: Phase 3 - Generate actions using RULES (NO AI - instant and free!)
app.post('/api/phase3/generate-actions-rules', (req, res) => {
    try {
        const { columnName, columnType, stats } = req.body;
        
        console.log(`\n📋 RULE-BASED action generation for: ${columnName}`);
        
        const actions = [];
        
        // RULE 1: CRITICAL - Unique Qualifier with Duplicates
        if (stats.isUniqueQualifier && stats.duplicates > 0) {
            actions.push({
                type: 'duplicates',
                title: '⚠️ Remove Duplicates (CRITICAL)',
                description: `This column is marked as a unique qualifier but has ${stats.duplicates} duplicate values.`,
                issueCount: stats.duplicates,
                severity: 'critical'
            });
        }
        // RULE 2: Non-Unique Qualifier with Many Duplicates
        else if (!stats.isUniqueQualifier && stats.duplicates > (stats.totalRecords * 0.1)) {
            actions.push({
                type: 'duplicates',
                title: 'Review Duplicate Values',
                description: `Found ${stats.duplicates} duplicate values.`,
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
                title: `Fill ${stats.emptyRecords} Empty Values`,
                description: `${percentage}% of records are empty.`,
                issueCount: stats.emptyRecords,
                severity: severity
            });
        }
        
        // RULE 4: Reference Data
        if (stats.isReferenceData) {
            actions.push({
                type: 'reference-validation',
                title: 'Validate Against ServiceNow',
                description: 'Check if values exist in ServiceNow.',
                issueCount: 0,
                severity: 'info'
            });
        }
        
        // TYPE-SPECIFIC RULES
        if (columnType === 'string') {
            actions.push({ type: 'whitespace', title: 'Trim Whitespace', description: 'Remove leading/trailing spaces.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'capitalization', title: 'Standardize Capitalization', description: 'Uniform casing.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'special-chars', title: 'Remove Special Characters', description: 'Clean special chars.', issueCount: 0, severity: 'info' });
        }
        else if (columnType === 'number') {
            actions.push({ type: 'currency', title: 'Remove Currency Symbols', description: 'Strip $, €, £.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'commas', title: 'Remove Commas', description: 'Convert 1,234.56 to 1234.56.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'numeric-validation', title: 'Validate Numeric Format', description: 'Flag non-numeric values.', issueCount: 0, severity: 'critical' });
            actions.push({ type: 'negative-values', title: 'Check Negative Values', description: 'Flag negatives.', issueCount: 0, severity: 'warning' });
            actions.push({ type: 'decimals', title: 'Standardize Decimal Places', description: 'Consistent decimals.', issueCount: 0, severity: 'info' });
        }
        else if (columnType === 'date') {
            actions.push({ type: 'date-format', title: 'Standardize Date Format', description: 'Convert to YYYY-MM-DD.', issueCount: 0, severity: 'critical' });
            actions.push({ type: 'invalid-dates', title: 'Fix Invalid Dates', description: 'Flag impossible dates.', issueCount: 0, severity: 'critical' });
            actions.push({ type: 'future-dates', title: 'Flag Future Dates', description: 'Future dates check.', issueCount: 0, severity: 'warning' });
            actions.push({ type: 'old-dates', title: 'Flag Historical Dates', description: 'Dates before 1990.', issueCount: 0, severity: 'info' });
        }
        else if (columnType === 'alphanumeric') {
            actions.push({ type: 'case-format', title: 'Standardize Case Format', description: 'Consistent case.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'separators', title: 'Standardize Separators', description: 'Consistent separators.', issueCount: 0, severity: 'info' });
            actions.push({ type: 'length-validation', title: 'Validate Length', description: 'Check length.', issueCount: 0, severity: 'warning' });
        }
        else if (columnType === 'boolean') {
            actions.push({ type: 'boolean-standardize', title: 'Standardize Boolean Values', description: 'Convert to true/false.', issueCount: 0, severity: 'critical' });
            actions.push({ type: 'boolean-invalid', title: 'Fix Invalid Boolean Values', description: 'Flag invalid values.', issueCount: 0, severity: 'critical' });
        }
        
        console.log(`   ✓ Generated ${actions.length} rule-based actions`);
        
        res.json({ success: true, actions: actions });
        
    } catch (error) {
        console.error('❌ Error generating rule-based actions:', error);
        res.status(500).json({ success: false, error: error.message });
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




// ===== PHASE 4: EXPORT =====
app.get('/api/phase4/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">Export Clean Data</h1>
            <div class="page-subtitle">Download your cleaned and normalized data</div>
        </div>

        <!-- Quality Score Widget - Persistent -->
        <div class="quality-widget">
            <div class="quality-score-display">
                <div class="score-value" id="widgetQualityScore">--<span style="font-size: 0.6em;">%</span></div>
                <div class="score-label">Final Quality Score</div>
            </div>
            <div class="quality-details">
                <div class="detail-item">
                    <div class="detail-value" id="widgetTotalRecords">0</div>
                    <div class="detail-label">Total Records</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetTotalColumns">0</div>
                    <div class="detail-label">Total Columns</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetFileName">-</div>
                    <div class="detail-label">File Name</div>
                </div>
                <div class="detail-item">
                    <div class="detail-value" id="widgetImprovementProgress">+0%</div>
                    <div class="detail-label">Improvement</div>
                </div>
            </div>
        </div>

        <div class="sn-content">
            <div class="sn-panel">
                <div class="panel-header">
                    <h2 class="panel-title">Phase 4 - Export</h2>
                </div>
                <div class="panel-body">
                    <p>Phase 4 export functionality coming soon...</p>
                </div>
            </div>
        </div>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   📊 EXCEL ANALYZER - Multi-Phase Architecture');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Server running on: http://localhost:${PORT}`);
    console.log('');
    console.log('   Available Phases:');
    console.log(`   → Phase 1: http://localhost:${PORT}/phase1 (Upload & Profiling)`);
    console.log(`   → Phase 2: http://localhost:${PORT}/phase2 (Analysis)`);
    console.log(`   → Phase 3: http://localhost:${PORT}/phase3 (AI Remediation)`);
    console.log(`   → Phase 3 Detail: http://localhost:${PORT}/phase3/column/[columnName]`);
    console.log(`   → Phase 4: http://localhost:${PORT}/phase4 (Export)`);
    console.log('═══════════════════════════════════════════════════════');
});
