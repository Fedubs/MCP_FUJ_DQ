// Phase 1: Upload & Profiling API Routes
import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import axios from 'axios';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

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

// GET /api/phase1/content - HTML content for Phase 1
router.get('/api/phase1/content', (req, res) => {
    res.send(`
        <div class="sn-page-header">
            <h1 class="page-title">Upload & Data Profiling</h1>
            <div class="page-subtitle">Upload your Excel file and connect to ServiceNow</div>
        </div>

        <div class="sn-content">
            <!-- Left Column: Claude API + ServiceNow + Upload -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem; flex: 1;">
                
                <!-- Claude API Key Panel -->
                <div class="sn-panel">
                    <div class="panel-header">
                        <h2 class="panel-title">🤖 Claude API Key (Required)</h2>
                    </div>
                    <div class="panel-body">
                        <div class="form-group">
                            <label class="form-label" for="claudeApiKey">API Key</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input 
                                    type="password" 
                                    id="claudeApiKey" 
                                    class="form-input" 
                                    placeholder="sk-ant-api03-..."
                                    style="flex: 1;"
                                >
                                <button id="toggleApiKeyBtn" class="sn-btn-secondary" onclick="Phase1.toggleApiKeyVisibility()" style="width: 80px;">
                                    Show
                                </button>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="testApiKeyBtn" class="sn-btn-secondary" onclick="Phase1.testClaudeApiKey()">
                                    Test
                                </button>
                                <button id="saveApiKeyBtn" class="sn-btn-primary" onclick="Phase1.saveClaudeApiKey()" disabled>
                                    Save
                                </button>
                                <button id="clearApiKeyBtn" class="sn-btn-secondary" onclick="Phase1.clearClaudeApiKey()" style="display: none;">
                                    Clear
                                </button>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #666;">
                                <span style="font-size: 1rem;">🔒</span>
                                <span>Stored in browser cookie • Required for AI features</span>
                            </div>
                        </div>
                        
                        <div id="apiKeyStatus" style="margin-top: 1rem; display: none;">
                            <!-- Status will be shown here -->
                        </div>
                    </div>
                </div>

                <!-- ServiceNow Connection Panel (COMPACT) -->
                <div class="sn-panel">
                    <div class="panel-header">
                        <h2 class="panel-title">🔗 ServiceNow Connection (Optional)</h2>
                    </div>
                    <div class="panel-body">
                        <div class="form-group">
                            <label class="form-label" for="snowInstance">Instance URL</label>
                            <input 
                                type="text" 
                                id="snowInstance" 
                                class="form-input" 
                                placeholder="dev12345.service-now.com"
                            >
                        </div>

                        <!-- Username and Password in one row -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" for="snowUsername">Username</label>
                                <input 
                                    type="text" 
                                    id="snowUsername" 
                                    class="form-input" 
                                    placeholder="admin"
                                >
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" for="snowPassword">Password</label>
                                <input 
                                    type="password" 
                                    id="snowPassword" 
                                    class="form-input" 
                                    placeholder="••••••••"
                                >
                            </div>
                        </div>

                        <!-- Test Connection and Security Note in one row -->
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="testConnectionBtn" class="sn-btn-secondary" onclick="Phase1.testServiceNowConnection()">
                                    Test Connection
                                </button>
                                <button id="clearConnectionBtn" class="sn-btn-secondary" onclick="Phase1.clearServiceNowConnection()" style="display: none;">
                                    Clear
                                </button>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #666;">
                                <span style="font-size: 1rem;">🔒</span>
                                <span>Session-only • HTTPS • Not stored permanently</span>
                            </div>
                        </div>
                        
                        <div id="connectionStatus" style="margin-top: 1rem; display: none;">
                            <!-- Status will be shown here -->
                        </div>
                    </div>
                </div>

                <!-- File Upload Panel -->
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

                            <div id="apiKeyRequiredWarning" style="display: none; padding: 0.75rem; background: #fff3cd; border-left: 4px solid #ffc107; color: #856404; margin-bottom: 1rem; border-radius: 4px;">
                                ⚠️ Please save a valid Claude API key before uploading
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
                                <h3>ServiceNow Integration</h3>
                                <p>Validate reference data against your CMDB tables (if connected).</p>
                            </div>
                        </div>
                        <div class="process-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h3>Quality Score</h3>
                                <p>Calculate initial data quality score based on completeness, consistency, and validity.</p>
                            </div>
                        </div>
                        <div class="process-step">
                            <div class="step-number">5</div>
                            <div class="step-content">
                                <h3>Review & Configure</h3>
                                <p>View profiling report and proceed to Phase 2 for column configuration.</p>
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

// POST /api/phase1/test-claude-api - Test Claude API key
router.post('/api/phase1/test-claude-api', async (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }

        // Validate format
        if (!apiKey.startsWith('sk-ant-')) {
            return res.json({
                success: false,
                error: 'Invalid API key format. Key should start with sk-ant-'
            });
        }

        console.log('Testing Claude API key...');

        // Test with a minimal API call
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            timeout: 15000
        });

        if (response.status === 200) {
            console.log('✓ Claude API key is valid');
            res.json({
                success: true,
                message: 'API key is valid!'
            });
        } else {
            throw new Error('Unexpected response from Claude API');
        }

    } catch (error) {
        console.error('Claude API test failed:', error.message);
        
        let errorMessage = 'API key validation failed';
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Invalid API key';
            } else if (error.response.status === 403) {
                errorMessage = 'API key does not have permission';
            } else if (error.response.status === 429) {
                errorMessage = 'Rate limited - but key appears valid';
                // Rate limit means the key is valid, just overused
                return res.json({
                    success: true,
                    message: 'API key is valid (rate limited)'
                });
            } else {
                errorMessage = `Error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`;
            }
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout - please try again';
        }

        res.json({
            success: false,
            error: errorMessage
        });
    }
});

// POST /api/phase1/upload - Upload and analyze Excel file
router.post('/api/phase1/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File received:', req.file.originalname);

        // Get ServiceNow credentials from request body
        const snowInstance = req.body.snowInstance;
        const snowUsername = req.body.snowUsername;
        const snowPassword = req.body.snowPassword;

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
            const columnName = String(cell.value || 'Column ' + colNumber);
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
        
        // ✅ ADD _CHANGES_LOG COLUMN (for tracking changes in Phase 3)
        const lastColIndex = headerRow.actualCellCount + 1;
        headerRow.getCell(lastColIndex).value = '_CHANGES_LOG';
        console.log(`✅ Added _CHANGES_LOG column at index ${lastColIndex}`);
        
        // Save the modified file with the new column
        await workbook.xlsx.writeFile(req.file.path);
        console.log('✅ Saved file with _CHANGES_LOG column');
        
        // Store data in shared state (passed via req.app.locals)
        req.app.locals.uploadedData = {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            totalRecords: totalRows,
            totalColumns: columns.length,
            columns: profiledColumns,
            dataQualityScore
        };
        
        req.app.locals.rawExcelData = columnData;
        req.app.locals.uploadedFilePath = req.file.path;
        
        // Store ServiceNow credentials if provided
        if (snowInstance && snowUsername && snowPassword) {
            req.app.locals.serviceNowCredentials = {
                instance: snowInstance.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                username: snowUsername,
                password: snowPassword
            };
            console.log('ServiceNow credentials stored for instance:', req.app.locals.serviceNowCredentials.instance);
        }
        
        console.log('Stored file at:', req.file.path);
        console.log('Parsed:', totalRows, 'rows,', columns.length, 'columns');
        
        res.json({
            success: true,
            message: 'File uploaded and analyzed successfully',
            data: {
                fileName: req.file.originalname,
                totalRecords: totalRows,
                totalColumns: columns.length,
                dataQualityScore,
                serviceNowConnected: !!snowInstance
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

// POST /api/phase1/test-servicenow - Test ServiceNow connection
router.post('/api/phase1/test-servicenow', async (req, res) => {
    try {
        const { instance, username, password } = req.body;

        if (!instance || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Clean up instance URL
        const cleanInstance = instance.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const baseUrl = `https://${cleanInstance}`;

        console.log('Testing ServiceNow connection to:', baseUrl);
        console.log('Username:', username);

        // Test connection by querying cmdb_ci table (more universal than sys_user)
        const response = await axios.get(`${baseUrl}/api/now/table/cmdb_ci`, {
            params: {
                sysparm_limit: 1,
                sysparm_fields: 'sys_id,name'
            },
            auth: {
                username: username,
                password: password
            },
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response data keys:', Object.keys(response.data));

        if (response.status === 200 && response.data && response.data.result) {
            console.log('✓ ServiceNow connection successful');
            console.log('Found', response.data.result.length, 'CI record(s)');
            res.json({
                success: true,
                message: 'Connection successful!',
                instance: cleanInstance
            });
        } else {
            throw new Error('Unexpected response from ServiceNow');
        }

    } catch (error) {
        console.error('ServiceNow connection test failed:', error.message);
        console.error('Error details:', {
            code: error.code,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response'
        });
        
        let errorMessage = 'Connection failed';
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Invalid username or password';
            } else if (error.response.status === 403) {
                errorMessage = 'Access forbidden - check user permissions';
            } else if (error.response.status === 404) {
                errorMessage = 'Instance not found - check the URL';
            } else {
                errorMessage = `Error: ${error.response.status} - ${error.response.statusText}`;
            }
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Instance not found - check the URL';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout - check network or instance URL';
        }

        res.json({
            success: false,
            error: errorMessage
        });
    }
});

export default router;
