// Smart Capitalization Helper Functions
// Handles intelligent capitalization with code detection, acronyms, special prefixes, etc.

// ===== SERVICENOW RECORD NUMBER PATTERNS =====
const SERVICENOW_RECORD_PATTERNS = [
    /^INC\d{7,}$/i,      // Incidents: INC0012345
    /^REQ\d{7,}$/i,      // Requests: REQ0001234
    /^RITM\d{7,}$/i,     // Request Items: RITM0012345
    /^CHG\d{7,}$/i,      // Changes: CHG0005678
    /^PRB\d{7,}$/i,      // Problems: PRB0001111
    /^TASK\d{7,}$/i,     // Tasks: TASK0012345
    /^SCTASK\d{7,}$/i,   // Catalog Tasks: SCTASK0012345
    /^KB\d{7,}$/i,       // Knowledge: KB0012345
    /^STRY\d{7,}$/i,     // Stories: STRY0012345
    /^PTASK\d{7,}$/i,    // Project Tasks: PTASK0012345
    /^PRJ\d{7,}$/i,      // Projects: PRJ0012345
    /^SECRQ\d{7,}$/i,    // Security Requests: SECRQ0012345
];

// ===== CODE DETECTION PATTERNS =====
const CODE_PATTERNS = [
    // ServiceNow sys_id (32-char hex)
    /^[a-f0-9]{32}$/i,
    
    // GUIDs/UUIDs
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    
    // MAC addresses
    /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    
    // IP addresses (IPv4)
    /^(\d{1,3}\.){3}\d{1,3}$/,
    
    // IP addresses (IPv6)
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/i,
    
    // Server/hostname patterns (alphanumeric with numbers)
    /^[a-z]{1,4}\d{2,}[a-z0-9]*$/i,  // e.g., a07uqq17, srv001
    
    // Codes with prefixes (SRV-001, VM_PROD_01, etc.)
    /^[A-Z]{2,5}[-_][A-Z0-9]+[-_]?[A-Z0-9]*$/i,
    
    // Version numbers
    /^\d+\.\d+(\.\d+)*$/,
    
    // Distinguished Names (LDAP)
    /^(CN|OU|DC)=/i,
    
    // Mixed alphanumeric codes (letters and numbers interleaved)
    /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{6,}$/,
    
    // Serial numbers (typically 8+ chars, alphanumeric)
    /^[A-Z0-9]{8,}$/,
    
    // Codes with underscores containing numbers
    /^[A-Za-z0-9]+_[A-Za-z0-9_]*\d+[A-Za-z0-9_]*$/,
];

// ===== SPECIAL NAME PREFIXES =====
const SPECIAL_PREFIXES = {
    'mc': (rest) => 'Mc' + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase(),
    'mac': (rest) => 'Mac' + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase(),
    "o'": (rest) => "O'" + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase(),
};

// Lowercase prefixes that should stay lowercase (except at start of string)
const LOWERCASE_PREFIXES = ['de', 'van', 'von', 'der', 'la', 'del', 'di', 'da'];

// Connector words that stay lowercase (except at start)
const CONNECTOR_WORDS = ['and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'as'];

// ===== DETECTION FUNCTIONS =====

/**
 * Check if value is a ServiceNow record number
 */
export function isServiceNowRecord(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    return SERVICENOW_RECORD_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if value is a code/identifier that should be kept as-is
 */
export function isCode(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    
    // Check ServiceNow records first
    if (isServiceNowRecord(trimmed)) return true;
    
    // Check other code patterns
    return CODE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if value is an email address
 */
export function isEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Check if value is already in CamelCase or PascalCase
 */
export function isCamelOrPascalCase(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    
    // Must have at least one lowercase followed by uppercase (camelCase)
    // or start with uppercase and have lowercase (PascalCase with mixed)
    // But NOT be all uppercase or all lowercase
    if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
        return false;
    }
    
    // Check for camelCase pattern: lowercase followed by uppercase
    if (/[a-z][A-Z]/.test(trimmed)) {
        return true;
    }
    
    return false;
}

/**
 * Check if word is an acronym (2-5 uppercase letters)
 */
export function isAcronym(word) {
    if (!word || typeof word !== 'string') return false;
    const trimmed = word.trim();
    return /^[A-Z]{2,5}$/.test(trimmed);
}

/**
 * Check if value has intentional mixed case (not all upper/lower)
 * This is different from CamelCase - it's for values like "McDonald" or "iOS"
 */
export function hasIntentionalMixedCase(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    
    // All uppercase or all lowercase = no intentional mixed case
    if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
        return false;
    }
    
    // Check for patterns that suggest intentional casing:
    // - McDonald, MacArthur (Mc/Mac prefix)
    // - O'Brien (O' prefix)
    // - iOS, iPad (lowercase followed by uppercase at position 1-2)
    // - CamelCase patterns
    
    const lowerValue = trimmed.toLowerCase();
    
    // Check Mc/Mac/O' patterns
    if (/^mc[a-z]/i.test(trimmed) && trimmed.charAt(2) === trimmed.charAt(2).toUpperCase()) {
        return true;
    }
    if (/^mac[a-z]/i.test(trimmed) && trimmed.charAt(3) === trimmed.charAt(3).toUpperCase()) {
        return true;
    }
    if (/^o'[a-z]/i.test(trimmed) && trimmed.charAt(2) === trimmed.charAt(2).toUpperCase()) {
        return true;
    }
    
    // iOS-style (lowercase start, uppercase after)
    if (/^[a-z][A-Z]/.test(trimmed)) {
        return true;
    }
    
    return isCamelOrPascalCase(trimmed);
}

// ===== CAPITALIZATION FUNCTION =====

/**
 * Smart capitalize a single word
 */
function capitalizeWord(word, isFirstWord) {
    if (!word) return word;
    
    const lowerWord = word.toLowerCase();
    
    // Check if it's an acronym (keep uppercase)
    if (isAcronym(word)) {
        return word;
    }
    
    // Check for special prefixes
    // Mc prefix (McDonald, McArthur)
    if (lowerWord.startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Mac prefix (MacArthur, MacLeod) - but not "machine" or "macro"
    if (lowerWord.startsWith('mac') && word.length > 3 && /^mac[a-z]/.test(lowerWord)) {
        // Check it's likely a name (next char should be uppercase in proper form)
        const commonMacWords = ['machine', 'macro', 'macaroni', 'macabre', 'mace'];
        if (!commonMacWords.some(w => lowerWord.startsWith(w))) {
            return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
        }
    }
    
    // O' prefix (O'Brien, O'Connor)
    if (lowerWord.startsWith("o'") && word.length > 2) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Lowercase prefixes (de, van, von, etc.) - only lowercase if not first word
    if (!isFirstWord && LOWERCASE_PREFIXES.includes(lowerWord)) {
        return lowerWord;
    }
    
    // Connector words - only lowercase if not first word
    if (!isFirstWord && CONNECTOR_WORDS.includes(lowerWord)) {
        return lowerWord;
    }
    
    // Standard title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Main smart capitalization function
 * Returns { suggestedFix, reason, shouldSkip }
 */
export function smartCapitalize(value) {
    if (!value || typeof value !== 'string') {
        return { suggestedFix: value, reason: null, shouldSkip: true };
    }
    
    const trimmed = value.trim();
    if (!trimmed) {
        return { suggestedFix: value, reason: null, shouldSkip: true };
    }
    
    // Rule 1: ServiceNow record numbers - keep as-is
    if (isServiceNowRecord(trimmed)) {
        return { 
            suggestedFix: trimmed, 
            reason: 'ServiceNow record number - kept as-is',
            shouldSkip: true 
        };
    }
    
    // Rule 2: Code/identifier detection - keep as-is
    if (isCode(trimmed)) {
        return { 
            suggestedFix: trimmed, 
            reason: 'Code/identifier detected - kept as-is',
            shouldSkip: true 
        };
    }
    
    // Rule 3: Email addresses - convert to lowercase
    if (isEmail(trimmed)) {
        const lowercase = trimmed.toLowerCase();
        if (lowercase !== trimmed) {
            return { 
                suggestedFix: lowercase, 
                reason: 'Email address - converted to lowercase',
                shouldSkip: false 
            };
        }
        return { suggestedFix: trimmed, reason: null, shouldSkip: true };
    }
    
    // Rule 4: CamelCase/PascalCase - keep as-is
    if (isCamelOrPascalCase(trimmed)) {
        return { 
            suggestedFix: trimmed, 
            reason: 'CamelCase/PascalCase detected - kept as-is',
            shouldSkip: true 
        };
    }
    
    // Rule 5: Intentional mixed case (McDonald, iOS, etc.) - keep as-is
    if (hasIntentionalMixedCase(trimmed)) {
        return { 
            suggestedFix: trimmed, 
            reason: 'Intentional mixed case detected - kept as-is',
            shouldSkip: true 
        };
    }
    
    // Rule 6: Apply smart title case
    const words = trimmed.split(/\s+/);
    const capitalizedWords = words.map((word, index) => {
        // Check if word is all caps and 2-5 chars (likely acronym)
        if (/^[A-Z]{2,5}$/.test(word)) {
            return word; // Keep acronym as-is
        }
        return capitalizeWord(word, index === 0);
    });
    
    const result = capitalizedWords.join(' ');
    
    if (result !== trimmed) {
        return { 
            suggestedFix: result, 
            reason: 'Standardized to Title Case',
            shouldSkip: false 
        };
    }
    
    return { suggestedFix: trimmed, reason: null, shouldSkip: true };
}

export default {
    isServiceNowRecord,
    isCode,
    isEmail,
    isCamelOrPascalCase,
    isAcronym,
    hasIntentionalMixedCase,
    smartCapitalize
};
