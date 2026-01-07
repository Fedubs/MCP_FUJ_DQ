// ServiceNow String Subtype Validation Rules
// Used by Phase 3 for issue detection and fixing

export const SUBTYPE_VALIDATIONS = {
    'serial-number': {
        name: 'Serial Number',
        minLength: 8,
        maxLength: 40,
        regex: /^[A-Za-z0-9\-_]+$/,
        reasonTooShort: 'Serial Number should be at least 8 characters. Most hardware vendors use 8-20 chars. Found {length}.',
        reasonTooLong: 'Serial Number should not exceed 40 characters (ServiceNow default). Found {length}.',
        reasonInvalidFormat: 'Serial Number should only contain letters, numbers, hyphens, and underscores.',
        suggestedFix: 'clean' // Remove invalid characters
    },
    
    'mac-address': {
        name: 'MAC Address',
        minLength: 17,
        maxLength: 17,
        regex: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
        reasonTooShort: 'MAC Address must be exactly 17 characters (format XX:XX:XX:XX:XX:XX). Found {length}.',
        reasonTooLong: 'MAC Address must be exactly 17 characters (format XX:XX:XX:XX:XX:XX). Found {length}.',
        reasonInvalidFormat: 'MAC Address must be 6 hex pairs separated by colons (e.g., 00:1A:2B:3C:4D:5E).',
        suggestedFix: 'format-mac' // Try to reformat
    },
    
    'ip-address-v4': {
        name: 'IP Address (IPv4)',
        minLength: 7,
        maxLength: 15,
        regex: /^(\d{1,3}\.){3}\d{1,3}$/,
        validateOctets: true, // Each octet must be 0-255
        reasonTooShort: 'IPv4 Address minimum is 7 characters (e.g., 0.0.0.0). Found {length}.',
        reasonTooLong: 'IPv4 Address maximum is 15 characters (e.g., 255.255.255.255). Found {length}.',
        reasonInvalidFormat: 'Invalid IPv4 address. Must be 4 numbers (0-255) separated by dots.',
        reasonInvalidOctet: 'Invalid IPv4 address. Each octet must be between 0 and 255. Found invalid value: {octet}.',
        suggestedFix: 'manual' // Needs manual review
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
        minLength: 3,
        maxLength: 63,
        regex: /^[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]$|^[A-Za-z0-9]$/,
        reasonTooShort: 'Hostname should be at least 3 characters for a meaningful name. Found {length}.',
        reasonTooLong: 'Hostname cannot exceed 63 characters (DNS label limit per RFC 1035). Found {length}.',
        reasonInvalidFormat: 'Hostname can only contain letters, numbers, and hyphens. Cannot start or end with hyphen. No spaces allowed.',
        suggestedFix: 'clean-hostname'
    },
    
    'asset-tag': {
        name: 'Asset Tag',
        minLength: 5,
        maxLength: 20,
        regex: /^[A-Za-z0-9\-_]+$/,
        reasonTooShort: 'Asset Tag should be at least 5 characters. Found {length}.',
        reasonTooLong: 'Asset Tag should not exceed 20 characters (typical org standard). Found {length}.',
        reasonInvalidFormat: 'Asset Tag should only contain letters, numbers, hyphens, and underscores.',
        suggestedFix: 'clean'
    },
    
    'location': {
        name: 'Location',
        minLength: 1,
        maxLength: 100,
        regex: null, // Free text
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
        regex: /^[^\n\r]*$/, // No line breaks
        reasonTooShort: 'Short Description cannot be empty.',
        reasonTooLong: 'Short Description exceeds ServiceNow 160 character limit. Found {length}.',
        reasonInvalidFormat: 'Short Description cannot contain line breaks. Use Description field for multi-line text.',
        suggestedFix: 'truncate'
    },
    
    'description': {
        name: 'Description',
        minLength: 1,
        maxLength: 4000,
        regex: null, // Multi-line allowed
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

// Helper function to validate a value against subtype rules
export function validateSubtype(value, subtype) {
    if (!subtype || !SUBTYPE_VALIDATIONS[subtype]) {
        return { valid: true };
    }
    
    const rules = SUBTYPE_VALIDATIONS[subtype];
    const strValue = String(value || '');
    const length = strValue.length;
    
    // Check minimum length
    if (length < rules.minLength) {
        return {
            valid: false,
            reason: rules.reasonTooShort.replace('{length}', length),
            suggestedFix: rules.suggestedFix
        };
    }
    
    // Check maximum length
    if (length > rules.maxLength) {
        return {
            valid: false,
            reason: rules.reasonTooLong.replace('{length}', length),
            suggestedFix: rules.suggestedFix
        };
    }
    
    // Check regex format if defined
    if (rules.regex && !rules.regex.test(strValue)) {
        return {
            valid: false,
            reason: rules.reasonInvalidFormat,
            suggestedFix: rules.suggestedFix
        };
    }
    
    // Special validation for IPv4 octets
    if (subtype === 'ip-address-v4' && rules.validateOctets) {
        const octets = strValue.split('.');
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (num < 0 || num > 255) {
                return {
                    valid: false,
                    reason: rules.reasonInvalidOctet.replace('{octet}', octet),
                    suggestedFix: 'manual'
                };
            }
        }
    }
    
    return { valid: true };
}

// Helper function to generate a fix for a value based on subtype
export function generateSubtypeFix(value, subtype) {
    if (!subtype || !SUBTYPE_VALIDATIONS[subtype]) {
        return value;
    }
    
    const rules = SUBTYPE_VALIDATIONS[subtype];
    const strValue = String(value || '');
    
    switch (rules.suggestedFix) {
        case 'clean':
            // Remove invalid characters, keep alphanumeric, hyphens, underscores
            return strValue.replace(/[^A-Za-z0-9\-_]/g, '');
            
        case 'clean-hostname':
            // Remove spaces and invalid chars, convert to uppercase
            return strValue.replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
            
        case 'clean-fqdn':
            // Lowercase, remove invalid chars
            return strValue.toLowerCase().replace(/[^a-z0-9\-\.]/g, '');
            
        case 'clean-phone':
            // Keep only digits, +, -, (, ), spaces
            return strValue.replace(/[^0-9\+\-\(\)\s]/g, '');
            
        case 'format-mac':
            // Try to format as MAC address
            const hexOnly = strValue.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
            if (hexOnly.length === 12) {
                return hexOnly.match(/.{2}/g).join(':');
            }
            return strValue; // Can't fix
            
        case 'add-protocol':
            // Add https:// if missing
            if (!strValue.match(/^https?:\/\//)) {
                return 'https://' + strValue;
            }
            return strValue;
            
        case 'truncate':
            // Truncate to max length
            return strValue.substring(0, rules.maxLength);
            
        case 'manual':
        default:
            return 'MANUAL_CHECK_REQUIRED';
    }
}

export default SUBTYPE_VALIDATIONS;
