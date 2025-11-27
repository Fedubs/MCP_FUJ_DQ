// ===== NEW MODULAR SERVER.JS =====
// Import dependencies
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

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

// Initialize Anthropic client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✓ Anthropic client initialized');
} else {
    console.warn('⚠ ANTHROPIC_API_KEY not set - AI features disabled');
}

// Shared state - accessible via req.app.locals in routes
app.locals.uploadedData = null;
app.locals.phase3Configuration = null;
app.locals.rawExcelData = {};
app.locals.uploadedFilePath = null;
app.locals.anthropic = anthropic;
app.locals.phase3Storage = { rawData: {} }; // For duplicate modal and fixes

// Phase 3 → Phase 4 Decision Tracking
app.locals.phase3Decisions = new Map(); // Track user decisions for Phase 4 visualization

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging - log ALL requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT });
});

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

// Serve phase folders as static (for frontend files)
app.use('/phase-1-upload-profiling', express.static(join(__dirname, 'phase-1-upload-profiling')));
app.use('/phase-2-analysis', express.static(join(__dirname, 'phase-2-analysis')));
app.use('/phase-3-ai-remediation', express.static(join(__dirname, 'phase-3-ai-remediation')));
app.use('/phase-4-export', express.static(join(__dirname, 'phase-4-export')));

// Serve main index.html for all phase routes
app.get(['/', '/phase1', '/phase2', '/phase3', '/phase4'], (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Phase 3 column detail route (special HTML page)
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

// ===== PHASE 3 → PHASE 4 TRACKING ENDPOINT =====
// Track user decisions (Keep/Reject/Change) for Phase 4 visualization
app.post('/api/phase3/track-decision', (req, res) => {
    try {
        const { rowNumber, columnName, action, originalValue, newValue } = req.body;
        
        // Validate required fields
        if (!rowNumber || !columnName || !action) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: rowNumber, columnName, action' 
            });
        }
        
        // Create unique key for this cell
        const key = `${rowNumber}-${columnName}`;
        
        // Store the decision
        req.app.locals.phase3Decisions.set(key, {
            rowNumber: parseInt(rowNumber),
            columnName,
            action,              // 'kept', 'rejected', or 'changed'
            originalValue,
            newValue,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✓ Tracked decision: Row ${rowNumber}, Column "${columnName}", Action: ${action}`);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error tracking decision:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== USE PHASE ROUTES =====
app.use(phase1Routes);
app.use(phase2Routes);
app.use(phase3ConfigRoutes);
app.use(phase3ActionsRoutes);
app.use(phase3FixesRoutes);
app.use(phase4Routes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   📊 EXCEL ANALYZER - Modular Architecture');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Server running on: http://0.0.0.0:' + PORT);
    console.log('');
    console.log('   Available Phases:');
    console.log('   → Phase 1: /phase1 (Upload & Profiling)');
    console.log('   → Phase 2: /phase2 (Analysis)');
    console.log('   → Phase 3: /phase3 (AI Remediation)');
    console.log('   → Phase 3 Detail: /phase3/column/[columnName]');
    console.log('   → Phase 4: /phase4 (Export)');
    console.log('   → Health: /health');
    console.log('═══════════════════════════════════════════════════════');
});
