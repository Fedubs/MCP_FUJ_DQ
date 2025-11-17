# MemoAI - Shared Utilities

## Purpose
Common utilities, helpers, constants, and functions used across all phases of the Excel Analyzer application.

## Contents

### 1. Data Quality Scoring Engine
- **Quality Score Calculator**:
  - Calculates overall data quality score (0-100)
  - Factors: completeness, consistency, accuracy, uniqueness
  - Weighted scoring algorithm
  - Score progression tracking

- **Score Components**:
  ```javascript
  qualityScore = (
    completeness * 0.30 +    // 30% weight - missing data
    consistency * 0.25 +      // 25% weight - format/pattern consistency
    accuracy * 0.25 +         // 25% weight - valid values
    uniqueness * 0.20         // 20% weight - duplicate handling
  )
  ```

### 2. Common Data Types & Interfaces
- TypeScript interfaces for:
  - Dataset structure
  - Column metadata
  - Issue objects
  - Quality report format
  - API responses
  - Export configurations

### 3. Validation Utilities
- **Data Type Detection**:
  - Auto-detect column data types
  - String, Number, Date, Boolean, Mixed
  
- **Format Validators**:
  - Date format validation
  - Email validation
  - Phone number patterns
  - ID/Serial number patterns
  - URL validation

- **Business Rules**:
  - Custom validation rules
  - Cross-field validation
  - Conditional validation

### 4. String Utilities
- **Text Processing**:
  - Trim and normalize whitespace
  - Case normalization
  - Remove special characters
  - Extract patterns
  
- **Similarity Functions**:
  - Levenshtein distance
  - Jaro-Winkler similarity
  - Fuzzy matching
  - Phonetic matching (Soundex, Metaphone)

### 5. Statistical Utilities
- **Basic Statistics**:
  - Mean, median, mode
  - Standard deviation
  - Percentiles
  - Outlier detection
  
- **Distribution Analysis**:
  - Frequency distribution
  - Value concentration
  - Unique value ratios

### 6. File Utilities
- **File Handling**:
  - File size validation
  - MIME type detection
  - Extension validation
  - Stream handling for large files
  
- **Temporary File Management**:
  - Create temp directories
  - Clean up temp files
  - File path utilities

### 7. Error Handling
- **Custom Error Classes**:
  - ValidationError
  - ParsingError
  - APIError
  - ExportError
  
- **Error Logger**:
  - Structured error logging
  - Error categorization
  - Stack trace management

### 8. Configuration Management
- **Constants**:
  - Supported file formats
  - Maximum file sizes
  - API endpoints
  - Quality score thresholds
  - Issue severity levels
  
- **Environment Config**:
  - API keys (Claude API)
  - Port numbers
  - File paths
  - Feature flags

### 9. API Utilities
- **Claude API Helper**:
  - API request formatting
  - Response parsing
  - Rate limiting
  - Error handling
  - Retry logic
  
- **Batching Functions**:
  - Batch API requests efficiently
  - Manage API quotas
  - Handle concurrent requests

### 10. Logging & Monitoring
- **Logger**:
  - Structured logging (Winston or similar)
  - Log levels (debug, info, warn, error)
  - Log rotation
  - Performance logging
  
- **Metrics**:
  - Track processing times
  - Monitor memory usage
  - API call statistics

## Usage Pattern
```javascript
// Import shared utilities
const { calculateQualityScore } = require('../shared/quality-scoring');
const { detectDataType } = require('../shared/validators');
const { similarity } = require('../shared/string-utils');

// Use across any phase
const score = calculateQualityScore(dataset);
const columnType = detectDataType(columnValues);
const match = similarity('Hewlet Packard', 'Hewlett-Packard');
```

## Design Principles
- **Pure Functions**: No side effects where possible
- **Reusability**: Used across all phases
- **Type Safety**: TypeScript interfaces
- **Performance**: Optimized for large datasets
- **Testability**: Easy to unit test
- **Documentation**: Clear JSDoc comments

## Technologies
- **String Matching**: string-similarity, natural
- **Statistics**: simple-statistics, mathjs
- **Utilities**: lodash (selective imports)
- **Logging**: winston
- **Type Safety**: TypeScript (optional)

## Maintenance Notes
- Keep utilities generic and phase-independent
- Add unit tests for all utility functions
- Document all exported functions
- Avoid circular dependencies with phases
- Use semantic versioning for breaking changes

---
*Phase Owner: Fed*
*Last Updated: November 12, 2025*
