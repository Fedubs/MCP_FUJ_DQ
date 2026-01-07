// Phase 3: Quality Score Calculator
// Calculates quality score based on all issues across all columns

import express from 'express';
import { smartCapitalize } from './capitalization-helpers.js';
import { 
    autoDetectSubtype,
    validateValue 
} from './data-format-validation.js';

const router = express.Router();

// ===== ISSUE DETECTION FUNCTIONS =====

/**
 * Detect uniqueness issues (duplicates in unique qualifier columns)
 */
function detectUniquenessIssues(columnData, isUniqueQualifier) {
    if (!isUniqueQualifier) return { count: 0, details: [] };
    
    const valueMap = {};
    columnData.forEach((value, index) => {
        const key = String(value || '');
        if (!valueMap[key]) valueMap[key] = [];
        valueMap[key].push(index);
    });
    
    let count = 0;
    const details = [];
    
    Object.entries(valueMap).forEach(([value, indices]) => {
        if (indices.length > 1 && value !== '' && value !== 'null' && value !== 'undefined') {
            // Count all duplicates except the first occurrence
            count += indices.length - 1;
            details.push({
                value,
                occurrences: indices.length,
                rows: indices.map(i => i + 2)
            });
        }
    });
    
    return { count, details };
}

/**
 * Detect validity issues (data format validation)
 */
function detectValidityIssues(columnData, subtype, columnType) {
    const effectiveSubtype = subtype || autoDetectSubtype('', columnType);
    let count = 0;
    const details = [];
    
    columnData.forEach((value, index) => {
        // Skip empty values
        if (value === null || value === undefined || value === '') return;
        
        const validation = validateValue(value, effectiveSubtype, columnType);
        
        if (!validation.valid || validation.warning || validation.needsNormalization) {
            count++;
            details.push({
                rowNumber: index + 2,
                value: String(value),
                reason: validation.reason
            });
        }
    });
    
    return { count, details };
}

/**
 * Detect consistency issues (capitalization, whitespace, special chars)
 */
function detectConsistencyIssues(columnData, columnType) {
    if (columnType !== 'string' && columnType !== 'alphanumeric') {
        return { count: 0, details: [] };
    }
    
    let count = 0;
    const details = [];
    
    columnData.forEach((value, index) => {
        if (typeof value !== 'string' || !value) return;
        
        const issues = [];
        
        // Whitespace check
        const trimmed = value.replace(/\s+/g, ' ').trim();
        if (trimmed !== value) {
            issues.push('whitespace');
        }
        
        // Capitalization check (using smart capitalize)
        const capResult = smartCapitalize(value);
        if (!capResult.shouldSkip && capResult.suggestedFix !== value) {
            issues.push('capitalization');
        }
        
        // Special characters check
        if (/[^a-zA-Z0-9\s\-_.]/.test(value)) {
            issues.push('special-chars');
        }
        
        if (issues.length > 0) {
            count++;
            details.push({
                rowNumber: index + 2,
                value,
                issues
            });
        }
    });
    
    return { count, details };
}

/**
 * Detect accuracy issues (reference data validation)
 * Note: This requires ServiceNow connection, so we just flag columns that need it
 */
function detectAccuracyIssues(columnData, isReferenceData, serviceNowTable) {
    if (!isReferenceData || !serviceNowTable) {
        return { count: 0, details: [], needsValidation: false };
    }
    
    // We can't validate without ServiceNow API call
    // Mark as needing validation - count will be updated after API call
    const nonEmptyCount = columnData.filter(v => v !== null && v !== undefined && v !== '').length;
    
    return { 
        count: 0, 
        details: [], 
        needsValidation: true,
        pendingCount: nonEmptyCount,
        serviceNowTable
    };
}

// ===== MAIN QUALITY SCORE CALCULATION =====

/**
 * Calculate quality score for all columns
 * Formula:
 *   - Uniqueness: 30% (duplicates in unique qualifier columns)
 *   - Validity: 30% (data format issues)
 *   - Consistency: 20% (capitalization, whitespace, special chars)
 *   - Accuracy: 20% (reference data - if configured, else redistributed)
 */
function calculateQualityScore(issueTracker) {
    const totals = issueTracker.totals;
    
    // Calculate raw scores (100 = perfect, 0 = all issues)
    
    // Uniqueness: based on unique qualifier columns only
    const uniquenessScore = totals.uniqueQualifierRecords > 0
        ? Math.max(0, 100 - (totals.uniqueness / totals.uniqueQualifierRecords * 100))
        : 100;
    
    // Validity: based on all non-empty values
    const validityScore = totals.nonEmptyValues > 0
        ? Math.max(0, 100 - (totals.validity / totals.nonEmptyValues * 100))
        : 100;
    
    // Consistency: based on string/alphanumeric columns only
    const consistencyScore = totals.stringValues > 0
        ? Math.max(0, 100 - (totals.consistency / totals.stringValues * 100))
        : 100;
    
    // Accuracy: based on reference data columns only
    let accuracyScore = 100;
    let accuracyWeight = 0.20;
    
    if (totals.referenceDataRecords > 0) {
        accuracyScore = Math.max(0, 100 - (totals.accuracy / totals.referenceDataRecords * 100));
    } else {
        // No reference data columns - redistribute weight
        accuracyWeight = 0;
    }
    
    // Adjust weights if no reference data
    let uniquenessWeight = 0.30;
    let validityWeight = 0.30;
    let consistencyWeight = 0.20;
    
    if (accuracyWeight === 0) {
        // Redistribute 20% to other factors
        uniquenessWeight = 0.375;
        validityWeight = 0.375;
        consistencyWeight = 0.25;
    }
    
    // Calculate weighted score
    const qualityScore = Math.round(
        (uniquenessScore * uniquenessWeight) +
        (validityScore * validityWeight) +
        (consistencyScore * consistencyWeight) +
        (accuracyScore * accuracyWeight)
    );
    
    return {
        qualityScore,
        breakdown: {
            uniqueness: { score: Math.round(uniquenessScore), weight: uniquenessWeight, issues: totals.uniqueness },
            validity: { score: Math.round(validityScore), weight: validityWeight, issues: totals.validity },
            consistency: { score: Math.round(consistencyScore), weight: consistencyWeight, issues: totals.consistency },
            accuracy: { score: Math.round(accuracyScore), weight: accuracyWeight, issues: totals.accuracy }
        }
    };
}

// POST /api/phase3/calculate-quality-score - Calculate all issues and quality score
router.post('/api/phase3/calculate-quality-score', async (req, res) => {
    try {
        console.log('📊 Calculating Quality Score for all columns...');
        
        const rawExcelData = req.app.locals.rawExcelData;
        const phase3Configuration = req.app.locals.phase3Configuration;
        
        if (!rawExcelData || !phase3Configuration) {
            return res.status(404).json({
                success: false,
                error: 'No data available. Please complete Phase 1 and 2 first.'
            });
        }
        
        const columns = phase3Configuration.columns;
        const totalRecords = phase3Configuration.totalRecords;
        
        // Initialize issue tracker
        const issueTracker = {
            totalRecords,
            columnCount: columns.length,
            columns: {},
            totals: {
                uniqueness: 0,
                validity: 0,
                consistency: 0,
                accuracy: 0,
                uniqueQualifierRecords: 0,
                nonEmptyValues: 0,
                stringValues: 0,
                referenceDataRecords: 0
            }
        };
        
        // Process each column
        for (const col of columns) {
            const columnName = col.name;
            const columnData = rawExcelData[columnName] || [];
            const columnType = col.type;
            const subtype = col.subtype;
            const isUniqueQualifier = col.isUniqueQualifier || false;
            const isReferenceData = col.isReferenceData || false;
            const serviceNowTable = col.serviceNowTable;
            
            console.log(`  Analyzing column: ${columnName} (type: ${columnType}, unique: ${isUniqueQualifier}, ref: ${isReferenceData})`);
            
            // Detect issues
            const uniquenessIssues = detectUniquenessIssues(columnData, isUniqueQualifier);
            const validityIssues = detectValidityIssues(columnData, subtype, columnType);
            const consistencyIssues = detectConsistencyIssues(columnData, columnType);
            const accuracyIssues = detectAccuracyIssues(columnData, isReferenceData, serviceNowTable);
            
            // Count non-empty values
            const nonEmptyCount = columnData.filter(v => v !== null && v !== undefined && v !== '').length;
            
            // Store column issues
            issueTracker.columns[columnName] = {
                uniqueness: uniquenessIssues,
                validity: validityIssues,
                consistency: consistencyIssues,
                accuracy: accuracyIssues,
                isUniqueQualifier,
                isReferenceData,
                columnType,
                totalRecords: columnData.length,
                nonEmptyRecords: nonEmptyCount
            };
            
            // Update totals
            issueTracker.totals.uniqueness += uniquenessIssues.count;
            issueTracker.totals.validity += validityIssues.count;
            issueTracker.totals.consistency += consistencyIssues.count;
            issueTracker.totals.accuracy += accuracyIssues.count;
            
            // Track record counts for score calculation
            if (isUniqueQualifier) {
                issueTracker.totals.uniqueQualifierRecords += columnData.length;
            }
            issueTracker.totals.nonEmptyValues += nonEmptyCount;
            if (columnType === 'string' || columnType === 'alphanumeric') {
                issueTracker.totals.stringValues += nonEmptyCount;
            }
            if (isReferenceData && serviceNowTable) {
                issueTracker.totals.referenceDataRecords += nonEmptyCount;
            }
        }
        
        // Calculate quality score
        const { qualityScore, breakdown } = calculateQualityScore(issueTracker);
        
        // Store in app.locals for progressive updates
        req.app.locals.issueTracker = issueTracker;
        req.app.locals.qualityScore = qualityScore;
        
        console.log(`📊 Quality Score: ${qualityScore}%`);
        console.log(`   Uniqueness: ${breakdown.uniqueness.issues} issues (${breakdown.uniqueness.score}%)`);
        console.log(`   Validity: ${breakdown.validity.issues} issues (${breakdown.validity.score}%)`);
        console.log(`   Consistency: ${breakdown.consistency.issues} issues (${breakdown.consistency.score}%)`);
        console.log(`   Accuracy: ${breakdown.accuracy.issues} issues (${breakdown.accuracy.score}%)`);
        
        res.json({
            success: true,
            qualityScore,
            breakdown,
            totals: issueTracker.totals,
            columnDetails: Object.entries(issueTracker.columns).map(([name, data]) => ({
                name,
                issues: {
                    uniqueness: data.uniqueness.count,
                    validity: data.validity.count,
                    consistency: data.consistency.count,
                    accuracy: data.accuracy.count,
                    total: data.uniqueness.count + data.validity.count + data.consistency.count + data.accuracy.count
                },
                isUniqueQualifier: data.isUniqueQualifier,
                isReferenceData: data.isReferenceData
            }))
        });
        
    } catch (error) {
        console.error('Error calculating quality score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/phase3/quality-score - Get current quality score
router.get('/api/phase3/quality-score', (req, res) => {
    const qualityScore = req.app.locals.qualityScore;
    const issueTracker = req.app.locals.issueTracker;
    
    if (qualityScore === undefined || !issueTracker) {
        return res.json({
            success: true,
            qualityScore: null,
            message: 'Quality score not yet calculated'
        });
    }
    
    res.json({
        success: true,
        qualityScore,
        totals: issueTracker.totals
    });
});

// POST /api/phase3/recalculate-quality-score - Full recalculation after fixes
router.post('/api/phase3/recalculate-quality-score', async (req, res) => {
    try {
        console.log('🔄 Full recalculation of Quality Score...');
        
        const rawExcelData = req.app.locals.rawExcelData;
        const phase3Configuration = req.app.locals.phase3Configuration;
        
        if (!rawExcelData || !phase3Configuration) {
            return res.status(404).json({
                success: false,
                error: 'No data available'
            });
        }
        
        const columns = phase3Configuration.columns;
        const totalRecords = phase3Configuration.totalRecords;
        
        // Rebuild issue tracker from scratch
        const issueTracker = {
            totalRecords,
            columnCount: columns.length,
            columns: {},
            totals: {
                uniqueness: 0,
                validity: 0,
                consistency: 0,
                accuracy: 0,
                uniqueQualifierRecords: 0,
                nonEmptyValues: 0,
                stringValues: 0,
                referenceDataRecords: 0
            }
        };
        
        // Process each column
        for (const col of columns) {
            const columnName = col.name;
            const columnData = rawExcelData[columnName] || [];
            const columnType = col.type;
            const subtype = col.subtype;
            const isUniqueQualifier = col.isUniqueQualifier || false;
            const isReferenceData = col.isReferenceData || false;
            const serviceNowTable = col.serviceNowTable;
            
            // Detect issues
            const uniquenessIssues = detectUniquenessIssues(columnData, isUniqueQualifier);
            const validityIssues = detectValidityIssues(columnData, subtype, columnType);
            const consistencyIssues = detectConsistencyIssues(columnData, columnType);
            const accuracyIssues = detectAccuracyIssues(columnData, isReferenceData, serviceNowTable);
            
            // Count non-empty values
            const nonEmptyCount = columnData.filter(v => v !== null && v !== undefined && v !== '').length;
            
            // Store column issues
            issueTracker.columns[columnName] = {
                uniqueness: uniquenessIssues,
                validity: validityIssues,
                consistency: consistencyIssues,
                accuracy: accuracyIssues,
                isUniqueQualifier,
                isReferenceData,
                columnType,
                totalRecords: columnData.length,
                nonEmptyRecords: nonEmptyCount
            };
            
            // Update totals
            issueTracker.totals.uniqueness += uniquenessIssues.count;
            issueTracker.totals.validity += validityIssues.count;
            issueTracker.totals.consistency += consistencyIssues.count;
            issueTracker.totals.accuracy += accuracyIssues.count;
            
            // Track record counts
            if (isUniqueQualifier) {
                issueTracker.totals.uniqueQualifierRecords += columnData.length;
            }
            issueTracker.totals.nonEmptyValues += nonEmptyCount;
            if (columnType === 'string' || columnType === 'alphanumeric') {
                issueTracker.totals.stringValues += nonEmptyCount;
            }
            if (isReferenceData && serviceNowTable) {
                issueTracker.totals.referenceDataRecords += nonEmptyCount;
            }
        }
        
        // Calculate quality score
        const { qualityScore, breakdown } = calculateQualityScore(issueTracker);
        
        // Store updated tracker
        req.app.locals.issueTracker = issueTracker;
        req.app.locals.qualityScore = qualityScore;
        
        console.log(`🔄 Updated Quality Score: ${qualityScore}%`);
        
        res.json({
            success: true,
            qualityScore,
            breakdown,
            totals: issueTracker.totals
        });
        
    } catch (error) {
        console.error('Error recalculating quality score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/phase3/recalculate-column - Recalculate issues for a single column after fixes
router.post('/api/phase3/recalculate-column', async (req, res) => {
    try {
        const { columnName } = req.body;
        
        console.log(`🔄 Recalculating issues for column: ${columnName}`);
        
        // Just do a full recalculation - simpler and more reliable
        const rawExcelData = req.app.locals.rawExcelData;
        const phase3Configuration = req.app.locals.phase3Configuration;
        
        if (!rawExcelData || !phase3Configuration) {
            return res.status(404).json({
                success: false,
                error: 'No data available'
            });
        }
        
        console.log(`🔄 rawExcelData keys: ${Object.keys(rawExcelData).join(', ')}`);
        console.log(`🔄 rawExcelData[${columnName}] sample: ${rawExcelData[columnName]?.slice(0, 3)}`);
        
        const columns = phase3Configuration.columns;
        const totalRecords = phase3Configuration.totalRecords;
        
        // Rebuild issue tracker from scratch
        const issueTracker = {
            totalRecords,
            columnCount: columns.length,
            columns: {},
            totals: {
                uniqueness: 0,
                validity: 0,
                consistency: 0,
                accuracy: 0,
                uniqueQualifierRecords: 0,
                nonEmptyValues: 0,
                stringValues: 0,
                referenceDataRecords: 0
            }
        };
        
        // Process each column
        for (const col of columns) {
            const colName = col.name;
            const columnData = rawExcelData[colName] || [];
            const columnType = col.type;
            const subtype = col.subtype;
            const isUniqueQualifier = col.isUniqueQualifier || false;
            const isReferenceData = col.isReferenceData || false;
            const serviceNowTable = col.serviceNowTable;
            
            // Detect issues
            const uniquenessIssues = detectUniquenessIssues(columnData, isUniqueQualifier);
            const validityIssues = detectValidityIssues(columnData, subtype, columnType);
            const consistencyIssues = detectConsistencyIssues(columnData, columnType);
            const accuracyIssues = detectAccuracyIssues(columnData, isReferenceData, serviceNowTable);
            
            // Count non-empty values
            const nonEmptyCount = columnData.filter(v => v !== null && v !== undefined && v !== '').length;
            
            // Store column issues
            issueTracker.columns[colName] = {
                uniqueness: uniquenessIssues,
                validity: validityIssues,
                consistency: consistencyIssues,
                accuracy: accuracyIssues,
                isUniqueQualifier,
                isReferenceData,
                columnType,
                totalRecords: columnData.length,
                nonEmptyRecords: nonEmptyCount
            };
            
            // Update totals
            issueTracker.totals.uniqueness += uniquenessIssues.count;
            issueTracker.totals.validity += validityIssues.count;
            issueTracker.totals.consistency += consistencyIssues.count;
            issueTracker.totals.accuracy += accuracyIssues.count;
            
            // Track record counts
            if (isUniqueQualifier) {
                issueTracker.totals.uniqueQualifierRecords += columnData.length;
            }
            issueTracker.totals.nonEmptyValues += nonEmptyCount;
            if (columnType === 'string' || columnType === 'alphanumeric') {
                issueTracker.totals.stringValues += nonEmptyCount;
            }
            if (isReferenceData && serviceNowTable) {
                issueTracker.totals.referenceDataRecords += nonEmptyCount;
            }
        }
        
        // Calculate quality score
        const { qualityScore, breakdown } = calculateQualityScore(issueTracker);
        
        // Store updated tracker
        req.app.locals.issueTracker = issueTracker;
        req.app.locals.qualityScore = qualityScore;
        
        console.log(`🔄 Updated Quality Score: ${qualityScore}%`);
        console.log(`   Consistency issues: ${issueTracker.totals.consistency}`);
        
        res.json({
            success: true,
            qualityScore,
            breakdown,
            columnIssues: issueTracker.columns[columnName] ? {
                uniqueness: issueTracker.columns[columnName].uniqueness.count,
                validity: issueTracker.columns[columnName].validity.count,
                consistency: issueTracker.columns[columnName].consistency.count,
                accuracy: issueTracker.columns[columnName].accuracy.count
            } : null
        });
        
    } catch (error) {
        console.error('Error recalculating column:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
