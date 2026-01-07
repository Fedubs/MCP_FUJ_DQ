// Phase 3: Configuration & Landing Page API Routes
import express from 'express';
import ExcelJS from 'exceljs';

const router = express.Router();

// GET /api/phase3/content - Phase 3 landing page
router.get('/api/phase3/content', (req, res) => {
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
            </div>
        </div>

        <!-- Quality Score Breakdown - Horizontal with Begin Remediation (AT BOTTOM) -->
        <div class="quality-breakdown-horizontal" id="qualityBreakdownSection">
            <div class="breakdown-card" id="uniquenessCard">
                <div class="breakdown-icon">📋</div>
                <div class="breakdown-score" id="uniquenessScore">--%</div>
                <div class="breakdown-label">Uniqueness</div>
                <div class="breakdown-detail" id="uniquenessDetail">(-- weight · -- issues)</div>
            </div>
            <div class="breakdown-card" id="validityCard">
                <div class="breakdown-icon">✓</div>
                <div class="breakdown-score" id="validityScore">--%</div>
                <div class="breakdown-label">Validity</div>
                <div class="breakdown-detail" id="validityDetail">(-- weight · -- issues)</div>
            </div>
            <div class="breakdown-card" id="consistencyCard">
                <div class="breakdown-icon">🔤</div>
                <div class="breakdown-score" id="consistencyScore">--%</div>
                <div class="breakdown-label">Consistency</div>
                <div class="breakdown-detail" id="consistencyDetail">(-- weight · -- issues)</div>
            </div>
            <div class="breakdown-card" id="accuracyCard">
                <div class="breakdown-icon">🎯</div>
                <div class="breakdown-score" id="accuracyScore">--%</div>
                <div class="breakdown-label">Accuracy</div>
                <div class="breakdown-detail" id="accuracyDetail">(-- weight · -- issues)</div>
            </div>
            <div class="breakdown-card begin-card" id="beginRemediationCard">
                <button id="beginRemediationBtn" class="begin-btn">
                    <span class="begin-text">Begin Remediation</span>
                    <span class="begin-arrow">→</span>
                </button>
            </div>
        </div>

        <style>
            .quality-breakdown-horizontal {
                display: flex;
                gap: 1rem;
                margin: 1.5rem 0;
                align-items: stretch;
            }
            .breakdown-card {
                flex: 1;
                background: white;
                border-radius: 8px;
                padding: 1.25rem 1rem;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 120px;
            }
            .breakdown-icon {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
            }
            .breakdown-score {
                font-size: 1.75rem;
                font-weight: bold;
                color: #28a745;
            }
            .breakdown-score.warning {
                color: #ffc107;
            }
            .breakdown-score.danger {
                color: #dc3545;
            }
            .breakdown-label {
                font-size: 0.9rem;
                color: #555;
                margin-top: 0.25rem;
            }
            .breakdown-detail {
                font-size: 0.75rem;
                color: #999;
                margin-top: 0.25rem;
            }
            .breakdown-card.begin-card {
                background: #74a290;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .begin-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                width: 100%;
                transition: transform 0.2s;
            }
            .begin-btn:hover {
                transform: scale(1.05);
            }
            .begin-arrow {
                font-size: 1.5rem;
            }
        </style>
        
        <script src="/shared/js/app.js"></script>
        <script src="/shared/js/phase3.js"></script>
    `);
});

// GET /api/phase3/configuration - Get Phase 3 configuration
router.get('/api/phase3/configuration', (req, res) => {
    const phase3Configuration = req.app.locals.phase3Configuration;
    
    if (!phase3Configuration) {
        return res.status(404).json({ 
            error: 'No configuration available. Please complete Phase 2 first.' 
        });
    }
    
    res.json(phase3Configuration);
});

// GET /api/phase3/raw-data - Get raw Excel data (reads from file)
router.get('/api/phase3/raw-data', async (req, res) => {
    try {
        const uploadedFilePath = req.app.locals.uploadedFilePath;
        
        if (!uploadedFilePath) {
            return res.status(404).json({ 
                error: 'No file uploaded. Please upload a file in Phase 1 first.' 
            });
        }
        
        console.log('Reading FRESH data from Excel file:', uploadedFilePath);
        
        // Read the Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(uploadedFilePath);
        
        // Get first worksheet
        const worksheet = workbook.worksheets[0];
        
        // Extract column headers
        const headerRow = worksheet.getRow(1);
        const columns = [];
        const columnData = {};
        
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const columnName = String(cell.value || 'Column ' + colNumber);
            columns.push(columnName);
            columnData[columnName] = [];
        });
        
        // Extract all data rows
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const columnName = columns[colNumber - 1];
                if (columnName) {
                    columnData[columnName].push(cell.value);
                }
            });
        });
        
        console.log('Loaded columns:', Object.keys(columnData));
        
        // AUTOMATICALLY store in phase3Storage for duplicate modal
        req.app.locals.phase3Storage = { rawData: columnData };
        console.log('✓ Stored raw data in phase3Storage');
        
        res.json(columnData);
        
    } catch (error) {
        console.error('Error reading Excel file:', error);
        res.status(500).json({ 
            error: 'Failed to read Excel file: ' + error.message 
        });
    }
});

export default router;
