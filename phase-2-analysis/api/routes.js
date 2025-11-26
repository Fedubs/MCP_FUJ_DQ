// Phase 2: Analysis & Configuration API Routes
import express from 'express';

const router = express.Router();

// GET /api/phase2/content - HTML content for Phase 2
router.get('/api/phase2/content', (req, res) => {
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

// GET /api/phase2/columns - Get column data
router.get('/api/phase2/columns', (req, res) => {
    const uploadedData = req.app.locals.uploadedData;
    
    if (!uploadedData) {
        return res.status(404).json({ 
            error: 'No file uploaded. Please upload a file in Phase 1 first.' 
        });
    }
    
    res.json(uploadedData);
});

// POST /api/phase2/auto-save-for-phase3 - Auto-save configuration
router.post('/api/phase2/auto-save-for-phase3', (req, res) => {
    try {
        req.app.locals.phase3Configuration = req.body;
        
        console.log('Configuration auto-saved for Phase 3:', {
            fileName: req.body.fileName,
            columns: req.body.columns.length,
            dataQualityScore: req.body.dataQualityScore
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

export default router;
