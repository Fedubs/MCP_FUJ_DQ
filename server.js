// ===== NEW MODULAR SERVER.JS =====
console.log('=== Step 1: Starting server.js ===');

// Import dependencies
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('=== Step 2: Core imports done ===');

// Import phase routes
import phase1Routes from './phase-1-upload-profiling/api/routes.js';
console.log('=== Step 3: Phase 1 loaded ===');
import phase2Routes from './phase-2-analysis/api/routes.js';
console.log('=== Step 4: Phase 2 loaded ===');
import phase3ConfigRoutes from './phase-3-ai-remediation/api/config.js';
console.log('=== Step 5: Phase 3 config loaded ===');
import phase3ActionsRoutes from './phase-3-ai-remediation/api/actions.js';
console.log('=== Step 6: Phase 3 actions loaded ===');
import phase3FixesRoutes from './phase-3-ai-remediation/api/fixes.js';
console.log('=== Step 7: Phase 3 fixes loaded ===');
import phase4Routes from './phase-4-export/api/routes.js';
console.log('=== Step 8: Phase 4 loaded ===');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`=== Step 9: Using PORT ${PORT} ===`);

// Initialize Anthropic client lazily (only when needed)
let anthropic = null;
const getAnthropic = async () => {
    if (!anthropic && process.env.ANTHROPIC_API_KEY) {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        console.log('✓ Anthropic client initialized on demand');
    }
    return anthropic;
};

// Shared state - accessible via req.app.locals in routes
app.locals.uploadedData = null;
app.locals.phase3Configuration = null;
app.locals.rawExcelData = {};
app.locals.uploadedFilePath = null;
app.locals.getAnthropic = getAnthropic;
app.locals.anthropic = null; // Will be set lazily
app.locals.phase3Storage = { rawData: {} };
app.locals.phase3Decisions = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
});

// Health check - FIRST route
app.get('/health', (req, res) => {
    console.log('[HEALTH] Health check called');
    res.status(200).json({ status: 'ok', port: PORT, time: new Date().toISOString() });
});

// Root route - simple test
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// MIME types middleware
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.path.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

// Serve shared static files
app.use('/shared', express.static(join(__dirname, 'shared')));

// Serve phase folders as static
app.use('/phase-1-upload-profiling', express.static(join(__dirname, 'phase-1-upload-profiling')));
app.use('/phase-2-analysis', express.static(join(__dirname, 'phase-2-analysis')));
app.use('/phase-3-ai-remediation', express.static(join(__dirname, 'phase-3-ai-remediation')));
app.use('/phase-4-export', express.static(join(__dirname, 'phase-4-export')));

// Serve main index.html for all phase routes
app.get(['/', '/phase1', '/phase2', '/phase3', '/phase4'], (req, res) => {
    console.log(`[PAGE] Serving index.html for ${req.path}`);
    res.sendFile(join(__dirname, 'index.html'));
});

// Phase 3 column detail route
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
            <link rel="stylesheet" href="/shared/css/duplicate-modal.css">
            <link rel="stylesheet" href="/shared/css/reference-modal.css">
        </head>
        <body>
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
                <div class="sn-breadcrumb">
                    <span class="breadcrumb-item">Home</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item active">Phase 3: AI Remediation</span>
                </div>
                <div class="sn-page-header">
                    <h1 class="page-title">AI-Powered Remediation</h1>
                    <div class="page-subtitle">Column-by-column data quality improvement</div>
                </div>
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
                <div class="three-panel-layout">
                    <div id="left-panel" class="left-panel"></div>
                    <div id="middle-panel" class="middle-panel"></div>
                    <div id="right-panel" class="right-panel"></div>
                </div>
            </div>
            <script type="module" src="/shared/js/duplicate-modal.js"></script>
            <script type="module" src="/shared/js/reference-modal.js"></script>
            <script type="module" src="/shared/js/phase3-column.js"></script>
        </body>
        </html>
    `;
    res.send(html);
});

// Phase 3 tracking endpoint
app.post('/api/phase3/track-decision', (req, res) => {
    try {
        const { rowNumber, columnName, action, originalValue, newValue } = req.body;
        if (!rowNumber || !columnName || !action) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        const key = `${rowNumber}-${columnName}`;
        req.app.locals.phase3Decisions.set(key, {
            rowNumber: parseInt(rowNumber),
            columnName,
            action,
            originalValue,
            newValue,
            timestamp: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Use phase routes
app.use(phase1Routes);
app.use(phase2Routes);
app.use(phase3ConfigRoutes);
app.use(phase3ActionsRoutes);
app.use(phase3FixesRoutes);
app.use(phase4Routes);

// Error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: err.message });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   📊 EXCEL ANALYZER - Running on Railway');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   ✓ Server listening on 0.0.0.0:${PORT}`);
    console.log('   ✓ Health check: /health');
    console.log('   ✓ Test: /test');
    console.log('═══════════════════════════════════════════════════════');
});

// Keep alive logging
setInterval(() => {
    console.log(`[ALIVE] Server still running on port ${PORT} at ${new Date().toISOString()}`);
}, 30000);

// Handle errors
server.on('error', (err) => {
    console.error('[SERVER ERROR]', err);
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT]', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED]', err);
});
