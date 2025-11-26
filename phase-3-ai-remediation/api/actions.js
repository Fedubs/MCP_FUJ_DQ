// Phase 3: Actions API Routes - Main router
// This file combines all action-related endpoints

import express from 'express';
import actionsGeneration from './actions-generation.js';
import actionsIssues from './actions-issues.js';
import actionsOperations from './actions-operations.js';

const router = express.Router();

// Combine all sub-routers
router.use(actionsGeneration);
router.use(actionsIssues);
router.use(actionsOperations);

export default router;
