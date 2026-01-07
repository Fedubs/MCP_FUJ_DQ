// ServiceNow Data Format Validation Rules
// Unified validation for ALL column types: String, Number, Date, Boolean, Alphanumeric

// ===== STRING/ALPHANUMERIC SUBTYPES =====
export const STRING_SUBTYPES = {
    'serial-number': {
        name: 'Serial Number',
        minLength: 1,
        maxLength: 40,
        regex: /^[A-Za-z0-9\-_]+$/,
        reasonTooShort: 'Serial Number cannot be empty.',
        reasonTooLong: 'Serial Number should not exceed 40 characters (ServiceNow default). Found {length}.',
        reasonInvalidFormat: 'Serial Number should only contain letters, numbers, hyphens, and underscores.',
        suggestedFix: 'clean'
    },
    
    'mac-address': {
        name: 'MAC Address',
        minLength: 17,
        maxLength: 17,
        regex: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
        reasonTooShort: 'MAC Address must be exactly 17 characters (format XX:XX:XX:XX:XX:XX). Found {length}.',
        reasonTooLong: 'MAC Address must be exactly 17 characters (format XX:XX:XX:XX:XX:XX). Found {length}.',
        reasonInvalidFormat: 'MAC Address must be 6 hex pairs separated by colons (e.g., 00:1A:2B:3C:4D:5E).',
        suggestedFix: 'format-mac'
    },
    
    'ip-address-v4': {
        name: 'IP Address (IPv4)',
        minLength: 7,
        maxLength: 15,
        regex: /^(\d{1,3}\.){3}\d{1,3}$/,
        validateOctets: true,
        reasonTooShort: 'IPv4 Address minimum is 7 characters (e.g., 0.0.0.0). Found {length}.',
        reasonTooLong: 'IPv4 Address maximum is 15 characters (e.g., 255.255.255.255). Found {length}.',
        reasonInvalidFormat: 'Invalid IPv4 address. Must be 4 numbers (0-255) separated by dots.',
        reasonInvalidOctet: 'Invalid IPv4 address. Each octet must be between 0 and 255. Found invalid value: {octet}.',
        suggestedFix: 'manual'
    },
    
    'ip-address-v6': {
        name: 'IP Address (IPv6)',
        minLength: 3,
        maxLength: 39,
        regex: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
        reasonTooShort: 'IPv6 Address minimum is 3 characters (e.g., ::1). Found {length}.',
        reasonTooLong: 'IPv6 Address maximum is 39 characters. Found {length}.',
        reasonInvalidFormat: 'Invalid IPv6 address format.',
        suggestedFix: 'manual'
    },
    
    'hostname': {
        name: 'Hostname',
        minLength: 1,
        maxLength: 63,
        regex: /^[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/,
        reasonTooShort: 'Hostname cannot be empty.',
        reasonTooLong: 'Hostname cannot exceed 63 characters (DNS label limit per RFC 1035). Found {length}.',
        reasonInvalidFormat: 'Hostname can only contain letters, numbers, and hyphens. Cannot start or end with hyphen. No spaces allowed.',
        suggestedFix: 'clean-hostname'
    },
    
    'asset-tag': {
        name: 'Asset Tag',
        minLength: 1,
        maxLength: 20,
        regex: /^[A-Za-z0-9\-_]+$/,
        reasonTooShort: 'Asset Tag cannot be empty.',
        reasonTooLong: 'Asset Tag should not exceed 20 characters (typical org standard). Found {length}.',
        reasonInvalidFormat: 'Asset Tag should only contain letters, numbers, hyphens, and underscores.',
        suggestedFix: 'clean'
    },
    
    'location': {
        name: 'Location',
        minLength: 1,
        maxLength: 100,
        regex: null,
        reasonTooShort: 'Location cannot be empty.',
        reasonTooLong: 'Location exceeds 100 character limit (ServiceNow cmn_location.name max). Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'name': {
        name: 'Name',
        minLength: 1,
        maxLength: 100,
        regex: null,
        reasonTooShort: 'Name cannot be empty.',
        reasonTooLong: 'Name exceeds 100 character limit. Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'model': {
        name: 'Model',
        minLength: 1,
        maxLength: 100,
        regex: null,
        reasonTooShort: 'Model cannot be empty.',
        reasonTooLong: 'Model exceeds 100 character limit. Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'manufacturer': {
        name: 'Manufacturer',
        minLength: 1,
        maxLength: 100,
        regex: null,
        reasonTooShort: 'Manufacturer cannot be empty.',
        reasonTooLong: 'Manufacturer exceeds 100 character limit. Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'os-version': {
        name: 'OS Version',
        minLength: 1,
        maxLength: 100,
        regex: null,
        reasonTooShort: 'OS Version cannot be empty.',
        reasonTooLong: 'OS Version exceeds 100 character limit. Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'fqdn': {
        name: 'FQDN',
        minLength: 5,
        maxLength: 255,
        regex: /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$/,
        reasonTooShort: 'FQDN should be at least 5 characters (e.g., a.b.c). Found {length}.',
        reasonTooLong: 'FQDN cannot exceed 255 characters (DNS limit). Found {length}.',
        reasonInvalidFormat: 'FQDN can only contain letters, numbers, hyphens, and dots. Must start and end with alphanumeric.',
        suggestedFix: 'clean-fqdn'
    },
    
    'uuid': {
        name: 'UUID/GUID',
        minLength: 36,
        maxLength: 36,
        regex: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        reasonTooShort: 'UUID must be exactly 36 characters (format 8-4-4-4-12 hex). Found {length}.',
        reasonTooLong: 'UUID must be exactly 36 characters (format 8-4-4-4-12 hex). Found {length}.',
        reasonInvalidFormat: 'UUID must be in format XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX (hex characters only).',
        suggestedFix: 'manual'
    },
    
    'sys-id': {
        name: 'ServiceNow sys_id',
        minLength: 32,
        maxLength: 32,
        regex: /^[0-9a-fA-F]{32}$/,
        reasonTooShort: 'sys_id must be exactly 32 hex characters. Found {length}.',
        reasonTooLong: 'sys_id must be exactly 32 hex characters. Found {length}.',
        reasonInvalidFormat: 'sys_id must contain only hexadecimal characters (0-9, a-f).',
        suggestedFix: 'manual'
    },
    
    'short-description': {
        name: 'Short Description',
        minLength: 1,
        maxLength: 160,
        regex: /^[^\n\r]*$/,
        reasonTooShort: 'Short Description cannot be empty.',
        reasonTooLong: 'Short Description exceeds ServiceNow 160 character limit. Found {length}.',
        reasonInvalidFormat: 'Short Description cannot contain line breaks. Use Description field for multi-line text.',
        suggestedFix: 'truncate'
    },
    
    'description': {
        name: 'Description',
        minLength: 1,
        maxLength: 4000,
        regex: null,
        reasonTooShort: 'Description cannot be empty.',
        reasonTooLong: 'Description exceeds ServiceNow 4000 character limit. Found {length}.',
        reasonInvalidFormat: null,
        suggestedFix: 'truncate'
    },
    
    'email': {
        name: 'Email Address',
        minLength: 5,
        maxLength: 100,
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        reasonTooShort: 'Email Address should be at least 5 characters (e.g., a@b.c). Found {length}.',
        reasonTooLong: 'Email Address should not exceed 100 characters. Found {length}.',
        reasonInvalidFormat: 'Invalid email format. Must contain @ and a valid domain (e.g., user@domain.com).',
        suggestedFix: 'manual'
    },
    
    'url': {
        name: 'URL',
        minLength: 10,
        maxLength: 1000,
        regex: /^https?:\/\/.+/,
        reasonTooShort: 'URL should be at least 10 characters. Found {length}.',
        reasonTooLong: 'URL should not exceed 1000 characters. Found {length}.',
        reasonInvalidFormat: 'URL must start with http:// or https://',
        suggestedFix: 'add-protocol'
    },
    
    'phone-number': {
        name: 'Phone Number',
        minLength: 8,
        maxLength: 20,
        regex: /^\+?[0-9\s\-\(\)]+$/,
        reasonTooShort: 'Phone Number should be at least 8 characters. Found {length}.',
        reasonTooLong: 'Phone Number should not exceed 20 characters (E.164 format). Found {length}.',
        reasonInvalidFormat: 'Phone Number should only contain digits, +, -, (, ), and spaces.',
        suggestedFix: 'clean-phone'
    }
};

// ===== NUMBER SUBTYPES =====
export const NUMBER_SUBTYPES = {
    'integer': { name: 'Integer', min: -2147483647, max: 2147483647, decimals: 0, allowNegative: true, reasonNotInteger: 'Value must be a whole number (no decimals). Found: {value}.', reasonOutOfRange: 'Integer must be between -2,147,483,647 and 2,147,483,647. Found: {value}.', reasonNegativeWarning: '⚠️ Negative value detected: {value}. Verify this is intentional.', suggestedFix: 'round' },
    'positive-integer': { name: 'Positive Integer', min: 0, max: 2147483647, decimals: 0, allowNegative: false, reasonNotInteger: 'Value must be a whole number (no decimals). Found: {value}.', reasonOutOfRange: 'Positive Integer must be between 0 and 2,147,483,647. Found: {value}.', reasonNegative: 'Value cannot be negative. Found: {value}.', suggestedFix: 'abs-round' },
    'port-number': { name: 'Port Number', min: 0, max: 65535, decimals: 0, allowNegative: false, reasonNotInteger: 'Port number must be a whole number. Found: {value}.', reasonOutOfRange: 'Port number must be between 0 and 65535. Found: {value}.', reasonNegative: 'Port number cannot be negative. Found: {value}.', suggestedFix: 'manual' },
    'percentage': { name: 'Percentage', min: 0, max: 100, decimals: 2, allowNegative: false, reasonOutOfRange: 'Percentage must be between 0 and 100. Found: {value}.', reasonNegative: 'Percentage cannot be negative. Found: {value}.', reasonTooManyDecimals: 'Percentage should have at most 2 decimal places. Found: {value}.', suggestedFix: 'clamp-round' },
    'currency': { name: 'Currency', min: null, max: null, decimals: 2, allowNegative: true, reasonTooManyDecimals: 'Currency should have exactly 2 decimal places. Found: {value}.', reasonNegativeWarning: '⚠️ Negative currency value detected: {value}. Verify this is intentional.', suggestedFix: 'round-2' },
    'decimal': { name: 'Decimal', min: null, max: null, decimals: 2, allowNegative: true, reasonTooManyDecimals: 'Decimal should have at most 2 decimal places. Found: {value}.', reasonNegativeWarning: '⚠️ Negative value detected: {value}. Verify this is intentional.', suggestedFix: 'round-2' },
    'memory-mb': { name: 'Memory (MB)', min: 0, max: 16777216, decimals: 0, allowNegative: false, reasonNotInteger: 'Memory (MB) must be a whole number. Found: {value}.', reasonOutOfRange: 'Memory (MB) must be between 0 and 16,777,216. Found: {value}.', reasonNegative: 'Memory cannot be negative. Found: {value}.', suggestedFix: 'abs-round' },
    'memory-gb': { name: 'Memory (GB)', min: 0, max: 16384, decimals: 1, allowNegative: false, reasonOutOfRange: 'Memory (GB) must be between 0 and 16,384. Found: {value}.', reasonNegative: 'Memory cannot be negative. Found: {value}.', reasonTooManyDecimals: 'Memory (GB) should have at most 1 decimal place. Found: {value}.', suggestedFix: 'abs-round-1' },
    'cpu-count': { name: 'CPU Count', min: 1, max: 1024, decimals: 0, allowNegative: false, reasonNotInteger: 'CPU Count must be a whole number. Found: {value}.', reasonOutOfRange: 'CPU Count must be between 1 and 1024. Found: {value}.', reasonNegative: 'CPU Count cannot be negative or zero. Found: {value}.', suggestedFix: 'manual' },
    'disk-gb': { name: 'Disk Size (GB)', min: 0, max: 1048576, decimals: 0, allowNegative: false, reasonNotInteger: 'Disk Size must be a whole number. Found: {value}.', reasonOutOfRange: 'Disk Size (GB) must be between 0 and 1,048,576. Found: {value}.', reasonNegative: 'Disk Size cannot be negative. Found: {value}.', suggestedFix: 'abs-round' }
};

// ===== DATE SUBTYPES =====
export const DATE_SUBTYPES = {
    'date-only': { name: 'Date Only', format: 'YYYY-MM-DD', regex: /^\d{4}-\d{2}-\d{2}$/, reasonInvalidFormat: 'Date must be in YYYY-MM-DD format (e.g., 2025-01-05). Found: {value}.', reasonInvalidDate: 'Invalid date. Please check month and day values. Found: {value}.', suggestedFix: 'format-date' },
    'datetime': { name: 'DateTime', format: 'YYYY-MM-DD HH:mm:ss', regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, reasonInvalidFormat: 'DateTime must be in YYYY-MM-DD HH:mm:ss format. Found: {value}.', reasonInvalidDate: 'Invalid date/time. Please check all values. Found: {value}.', suggestedFix: 'format-datetime' },
    'time-only': { name: 'Time Only', format: 'HH:mm:ss', regex: /^\d{2}:\d{2}:\d{2}$/, reasonInvalidFormat: 'Time must be in HH:mm:ss format (e.g., 14:30:00). Found: {value}.', reasonInvalidTime: 'Invalid time. Hours must be 0-23, minutes and seconds 0-59. Found: {value}.', suggestedFix: 'format-time' },
    'servicenow-datetime': { name: 'ServiceNow DateTime', format: 'YYYY-MM-DD HH:mm:ss', regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, reasonInvalidFormat: 'ServiceNow DateTime must be in YYYY-MM-DD HH:mm:ss format. Found: {value}.', reasonInvalidDate: 'Invalid date/time for ServiceNow. Found: {value}.', suggestedFix: 'format-datetime' }
};

// ===== BOOLEAN SUBTYPES =====
export const BOOLEAN_SUBTYPES = {
    'standard': { name: 'Boolean (true/false)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], outputTrue: 'true', outputFalse: 'false', reasonInvalid: 'Value must be a boolean (true/false, yes/no, 1/0). Found: {value}.', suggestedFix: 'normalize-boolean' },
    'yes-no': { name: 'Boolean (Yes/No)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], outputTrue: 'Yes', outputFalse: 'No', reasonInvalid: 'Value must be Yes or No. Found: {value}.', suggestedFix: 'normalize-boolean' },
    'one-zero': { name: 'Boolean (1/0)', trueValues: ['true', '1', 'yes', 'y', 'on'], falseValues: ['false', '0', 'no', 'n', 'off'], outputTrue: '1', outputFalse: '0', reasonInvalid: 'Value must be 1 or 0. Found: {value}.', suggestedFix: 'normalize-boolean' }
};

// ===== AUTO-DETECTION PATTERNS =====
export const AUTO_DETECT_PATTERNS = {
    'mac': 'mac-address', 'mac_address': 'mac-address', 'macaddress': 'mac-address',
    'serial': 'serial-number', 'serial_number': 'serial-number', 'serialnumber': 'serial-number', 'sn': 'serial-number',
    'ip': 'ip-address-v4', 'ip_address': 'ip-address-v4', 'ipaddress': 'ip-address-v4', 'ipv4': 'ip-address-v4', 'ipv6': 'ip-address-v6',
    'hostname': 'hostname', 'host_name': 'hostname', 'host': 'hostname',
    'email': 'email', 'email_address': 'email', 'mail': 'email',
    'phone': 'phone-number', 'telephone': 'phone-number', 'tel': 'phone-number', 'mobile': 'phone-number',
    'fqdn': 'fqdn', 'dns_name': 'fqdn', 'dnsname': 'fqdn',
    'sys_id': 'sys-id', 'sysid': 'sys-id', 'uuid': 'uuid', 'guid': 'uuid',
    'asset_tag': 'asset-tag', 'assettag': 'asset-tag', 'asset': 'asset-tag',
    'url': 'url', 'website': 'url', 'link': 'url',
    'location': 'location', 'site': 'location',
    'model': 'model', 'manufacturer': 'manufacturer', 'vendor': 'manufacturer',
    'description': 'description', 'short_description': 'short-description',
    'port': 'port-number', 'port_number': 'port-number',
    'percentage': 'percentage', 'percent': 'percentage',
    'cpu': 'cpu-count', 'cpu_count': 'cpu-count', 'cpus': 'cpu-count', 'cores': 'cpu-count',
    'memory': 'memory-mb', 'ram': 'memory-mb', 'memory_mb': 'memory-mb', 'memory_gb': 'memory-gb', 'ram_gb': 'memory-gb',
    'disk': 'disk-gb', 'disk_size': 'disk-gb', 'storage': 'disk-gb',
    'cost': 'currency', 'price': 'currency', 'amount': 'currency'
};

// ===== HELPER FUNCTIONS =====
export function autoDetectSubtype(columnName, columnType) {
    const normalized = columnName.toLowerCase().replace(/[\s\-]/g, '_');
    if (AUTO_DETECT_PATTERNS[normalized]) return AUTO_DETECT_PATTERNS[normalized];
    for (const [pattern, subtype] of Object.entries(AUTO_DETECT_PATTERNS)) {
        if (normalized.includes(pattern) || pattern.includes(normalized)) return subtype;
    }
    return null;
}

export function getSubtypesForColumnType(columnType) {
    switch (columnType) {
        case 'string': case 'alphanumeric': return STRING_SUBTYPES;
        case 'number': return NUMBER_SUBTYPES;
        case 'date': return DATE_SUBTYPES;
        case 'boolean': return BOOLEAN_SUBTYPES;
        default: return {};
    }
}

export function validateValue(value, subtype, columnType) {
    if (value === null || value === undefined || value === '') return { valid: true, isEmpty: true };
    const strValue = String(value);
    if (STRING_SUBTYPES[subtype]) return validateStringSubtype(strValue, subtype);
    if (NUMBER_SUBTYPES[subtype]) return validateNumberSubtype(value, subtype);
    if (DATE_SUBTYPES[subtype]) return validateDateSubtype(value, subtype);
    if (BOOLEAN_SUBTYPES[subtype]) return validateBooleanSubtype(strValue, subtype);
    return validateBasicType(value, columnType);
}

function validateStringSubtype(value, subtype) {
    const rules = STRING_SUBTYPES[subtype];
    const length = value.length;
    if (length < rules.minLength) return { valid: false, reason: rules.reasonTooShort.replace('{length}', length), suggestedFix: rules.suggestedFix, severity: 'error' };
    if (length > rules.maxLength) return { valid: false, reason: rules.reasonTooLong.replace('{length}', length), suggestedFix: rules.suggestedFix, severity: 'error' };
    if (rules.regex && !rules.regex.test(value)) return { valid: false, reason: rules.reasonInvalidFormat, suggestedFix: rules.suggestedFix, severity: 'error' };
    if (subtype === 'ip-address-v4' && rules.validateOctets) {
        const octets = value.split('.');
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (num < 0 || num > 255) return { valid: false, reason: rules.reasonInvalidOctet.replace('{octet}', octet), suggestedFix: 'manual', severity: 'error' };
        }
    }
    return { valid: true };
}

function validateNumberSubtype(value, subtype) {
    const rules = NUMBER_SUBTYPES[subtype];
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return { valid: false, reason: `Value must be a number. Found: ${value}`, suggestedFix: 'manual', severity: 'error' };
    if (rules.decimals === 0 && !Number.isInteger(numValue)) return { valid: false, reason: (rules.reasonNotInteger || `Value must be a whole number. Found: ${value}`).replace('{value}', value), suggestedFix: rules.suggestedFix, severity: 'error' };
    if (rules.decimals !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > rules.decimals) return { valid: false, reason: (rules.reasonTooManyDecimals || `Too many decimal places. Found: ${value}`).replace('{value}', value), suggestedFix: rules.suggestedFix, severity: 'warning' };
    }
    if (numValue < 0) {
        if (!rules.allowNegative) return { valid: false, reason: (rules.reasonNegative || `Value cannot be negative. Found: ${value}`).replace('{value}', value), suggestedFix: rules.suggestedFix, severity: 'error' };
        else if (rules.reasonNegativeWarning) return { valid: true, warning: true, reason: rules.reasonNegativeWarning.replace('{value}', value), suggestedFix: null, severity: 'warning' };
    }
    if (rules.min !== null && numValue < rules.min) return { valid: false, reason: (rules.reasonOutOfRange || `Value out of range. Found: ${value}`).replace('{value}', value), suggestedFix: rules.suggestedFix, severity: 'error' };
    if (rules.max !== null && numValue > rules.max) return { valid: false, reason: (rules.reasonOutOfRange || `Value out of range. Found: ${value}`).replace('{value}', value), suggestedFix: rules.suggestedFix, severity: 'error' };
    return { valid: true };
}

function validateDateSubtype(value, subtype) {
    const rules = DATE_SUBTYPES[subtype];
    const strValue = String(value);
    if (rules.regex && !rules.regex.test(strValue)) return { valid: false, reason: rules.reasonInvalidFormat.replace('{value}', strValue), suggestedFix: rules.suggestedFix, severity: 'error' };
    const date = new Date(value);
    if (isNaN(date.getTime())) return { valid: false, reason: (rules.reasonInvalidDate || 'Invalid date').replace('{value}', strValue), suggestedFix: rules.suggestedFix, severity: 'error' };
    return { valid: true };
}

function validateBooleanSubtype(value, subtype) {
    const rules = BOOLEAN_SUBTYPES[subtype];
    const lowerValue = value.toLowerCase().trim();
    if (rules.trueValues.includes(lowerValue) || rules.falseValues.includes(lowerValue)) {
        const isTrue = rules.trueValues.includes(lowerValue);
        const expectedOutput = isTrue ? rules.outputTrue : rules.outputFalse;
        if (value !== expectedOutput) return { valid: true, needsNormalization: true, reason: `Boolean value "${value}" should be normalized to "${expectedOutput}".`, suggestedFix: expectedOutput, severity: 'info' };
        return { valid: true };
    }
    return { valid: false, reason: rules.reasonInvalid.replace('{value}', value), suggestedFix: 'manual', severity: 'error' };
}

function validateBasicType(value, columnType) {
    switch (columnType) {
        case 'number':
            if (isNaN(parseFloat(value))) return { valid: false, reason: `Value must be a number. Found: ${value}`, suggestedFix: 'manual', severity: 'error' };
            if (parseFloat(value) < 0) return { valid: true, warning: true, reason: `⚠️ Negative value detected: ${value}. Verify this is intentional.`, severity: 'warning' };
            break;
        case 'date':
            const date = new Date(value);
            if (isNaN(date.getTime())) return { valid: false, reason: `Invalid date format. Found: ${value}`, suggestedFix: 'manual', severity: 'error' };
            break;
    }
    return { valid: true };
}

export function generateFix(value, subtype, columnType) {
    if (value === null || value === undefined || value === '') return value;
    const strValue = String(value);
    if (STRING_SUBTYPES[subtype]) {
        const rules = STRING_SUBTYPES[subtype];
        switch (rules.suggestedFix) {
            case 'clean': return strValue.replace(/[^A-Za-z0-9\-_]/g, '');
            case 'clean-hostname': return strValue.replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
            case 'clean-fqdn': return strValue.toLowerCase().replace(/[^a-z0-9\-\.]/g, '');
            case 'clean-phone': return strValue.replace(/[^0-9\+\-\(\)\s]/g, '');
            case 'format-mac':
                const hexOnly = strValue.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                if (hexOnly.length === 12) return hexOnly.match(/.{2}/g).join(':');
                return 'MANUAL_CHECK_REQUIRED';
            case 'add-protocol': return strValue.match(/^https?:\/\//) ? strValue : 'https://' + strValue;
            case 'truncate': return strValue.substring(0, rules.maxLength);
            default: return 'MANUAL_CHECK_REQUIRED';
        }
    }
    if (NUMBER_SUBTYPES[subtype]) {
        const rules = NUMBER_SUBTYPES[subtype];
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 'MANUAL_CHECK_REQUIRED';
        switch (rules.suggestedFix) {
            case 'round': return Math.round(numValue).toString();
            case 'abs-round': return Math.abs(Math.round(numValue)).toString();
            case 'round-1': return numValue.toFixed(1);
            case 'abs-round-1': return Math.abs(numValue).toFixed(1);
            case 'round-2': return numValue.toFixed(2);
            case 'clamp-round': return Math.max(rules.min, Math.min(rules.max, numValue)).toFixed(rules.decimals);
            default: return 'MANUAL_CHECK_REQUIRED';
        }
    }
    if (DATE_SUBTYPES[subtype]) {
        const date = new Date(value);
        if (isNaN(date.getTime())) return 'MANUAL_CHECK_REQUIRED';
        const rules = DATE_SUBTYPES[subtype];
        switch (rules.suggestedFix) {
            case 'format-date': return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            case 'format-datetime': return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
            case 'format-time': return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
            default: return 'MANUAL_CHECK_REQUIRED';
        }
    }
    if (BOOLEAN_SUBTYPES[subtype]) {
        const rules = BOOLEAN_SUBTYPES[subtype];
        const lowerValue = strValue.toLowerCase().trim();
        if (rules.trueValues.includes(lowerValue)) return rules.outputTrue;
        if (rules.falseValues.includes(lowerValue)) return rules.outputFalse;
        return 'MANUAL_CHECK_REQUIRED';
    }
    return 'MANUAL_CHECK_REQUIRED';
}

export const SUBTYPE_VALIDATIONS = STRING_SUBTYPES;
export const validateSubtype = (value, subtype) => validateValue(value, subtype, 'string');
export const generateSubtypeFix = (value, subtype) => generateFix(value, subtype, 'string');

export default { STRING_SUBTYPES, NUMBER_SUBTYPES, DATE_SUBTYPES, BOOLEAN_SUBTYPES, AUTO_DETECT_PATTERNS, autoDetectSubtype, getSubtypesForColumnType, validateValue, generateFix };
