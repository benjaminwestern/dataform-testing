const debugLog = (obj) => {
    if (!obj) {
        console.log('Debug: null or undefined value');
        return;
    }
    console.log('Debug:', {
        type: typeof obj,
        isArray: Array.isArray(obj),
        keys: Object.keys(obj || {}),
        length: obj?.length,
        value: obj
    });
};

function prepareSource(source) {
    return `
    SELECT 
        '${source.name}' as source_name,
        ${source.priority} as source_priority,
        ${Object.keys(source.columnMapping || {}).map(attr =>
        `${source.columnMapping[attr]} as ${attr}`
    ).join(',\n        ')}
    FROM ${source.table}
    WHERE ${source.filter || '1=1'}
    `;
}

function generateSourceUnion(sourceConfigs, returnSelect = false) {
    return `
    WITH source_data AS (
        ${sourceConfigs.map(source => prepareSource(source)).join('\n        UNION ALL\n        ')}
    )
    
    ${returnSelect ? 'SELECT * FROM source_data' : ''}
    
    `;
}

function generateCompositeId(fields) {
    return `
        -- Base64 is required to store the binary hash as a string
        TO_BASE64(
            SHA256(
                CONCAT(
                    ${fields.map(field => `COALESCE(UPPER(TRIM(CAST(${field} AS STRING))), '')`).join(",'|',")})
            )
        )
    `;
}

function md5Hash(field) {
    return `
        TO_BASE64(
            MD5(
                IFNULL(
                    NULLIF(UPPER(TRIM(CAST(${field} AS STRING))), ''),
                    '^^'
                )
            )
        )
    `;
}

function formatTimestampSeconds(seconds) {
    return `TIMESTAMP_MICROS(CAST(SAFE_MULTIPLY(ROUND(SAFE_CAST(${seconds} as BIGNUMERIC), 6), 1000000) AS INT64))`;
}

function generateTableName(tableRef) {
    const tableParts = tableRef.split(".");
    const tableName = tableParts.length > 2 ? tableParts[2].replace("`", "") : null;
    return tableName;
}

function validateString(column, {
    validateEmpty = false,
    validateLength = false,
    maxLength = 100,
    allowNumbers = true,
    allowSpecialChars = true,
    allowMultipleSpaces = true,
    trimSpaces = false,
    properCase = false,
    returnValidationStatus = true
} = {}) {
    const numberPattern = "[0-9]";
    const specialCharPattern = "[^a-zA-Z0-9\\\\s]";
    const multiSpacePattern = "\\\\s+";

    const baseColumn = `TRIM(${column})`;
    const cleanedColumn = trimSpaces
        ? `REGEXP_REPLACE(${baseColumn}, "${multiSpacePattern}", ' ')`
        : baseColumn;

    const valueCase = `
        CASE
            WHEN ${column} IS NULL THEN NULL
            WHEN ${validateEmpty} AND REGEXP_REPLACE(${cleanedColumn}, ' ', '') = '' THEN NULL
            WHEN ${validateLength} AND LENGTH(${cleanedColumn}) > ${maxLength} THEN NULL
            WHEN NOT ${allowNumbers} AND REGEXP_CONTAINS(${cleanedColumn}, "${numberPattern}") THEN NULL
            WHEN NOT ${allowSpecialChars} AND REGEXP_CONTAINS(${cleanedColumn}, "${specialCharPattern}") THEN NULL
            WHEN NOT ${allowMultipleSpaces} AND REGEXP_CONTAINS(${cleanedColumn}, "${multiSpacePattern}") THEN NULL
            ELSE ${properCase ? `INITCAP(${cleanedColumn})` : cleanedColumn}
        END
    `;

    if (!returnValidationStatus) {
        return valueCase;
    }

    const statusCase = `
        CASE
            WHEN ${column} IS NULL THEN 'MISSING'
            WHEN ${validateEmpty} AND REGEXP_REPLACE(${cleanedColumn}, ' ', '') = '' THEN 'EMPTY'
            WHEN ${validateLength} AND LENGTH(${cleanedColumn}) > ${maxLength} THEN 'TOO_LONG'
            WHEN NOT ${allowNumbers} AND REGEXP_CONTAINS(${cleanedColumn}, "${numberPattern}") THEN 'CONTAINS_NUMBERS'
            WHEN NOT ${allowSpecialChars} AND REGEXP_CONTAINS(${cleanedColumn}, "${specialCharPattern}") THEN 'CONTAINS_SPECIAL_CHARS'
            WHEN NOT ${allowMultipleSpaces} AND REGEXP_CONTAINS(${cleanedColumn}, "${multiSpacePattern}") THEN 'MULTIPLE_SPACES'
            ELSE 'VALID'
        END
    `;

    return `
        STRUCT(
            ${valueCase} as value,
            ${statusCase} as validation_status
        )
    `;
}

function validateDate(column, dateFormat = 'AU') {
    return `
        STRUCT(
            CASE
                WHEN ${column} IS NULL THEN NULL
                -- Handle various date formats
                WHEN SAFE.PARSE_DATE('${dateFormat === 'AU' ? '%d/%m/%Y' : '%m/%d/%Y'}', 
                     REGEXP_REPLACE(${column}, r'[-.]', '/')) IS NOT NULL
                THEN SAFE.PARSE_DATE('${dateFormat === 'AU' ? '%d/%m/%Y' : '%m/%d/%Y'}', 
                     REGEXP_REPLACE(${column}, r'[-.]', '/'))
                WHEN SAFE.PARSE_DATE('YYYY-MM-DD', ${column}) IS NOT NULL
                THEN SAFE.PARSE_DATE('YYYY-MM-DD', ${column})
                ELSE NULL
            END as value,
            CASE
                WHEN ${column} IS NULL THEN 'MISSING'
                WHEN TRIM(${column}) = '' THEN 'EMPTY'
                WHEN REGEXP_CONTAINS(${column}, r'[A-Za-z]') THEN 'CONTAINS_LETTERS'
                WHEN NOT REGEXP_CONTAINS(${column}, r'^[0-9]{1,4}[-/\.][0-9]{1,2}[-/\.][0-9]{1,4}$') 
                THEN 'INVALID_FORMAT'
                WHEN SAFE.PARSE_DATE('${dateFormat === 'AU' ? '%d/%m/%Y' : '%m/%d/%Y'}', 
                     REGEXP_REPLACE(${column}, r'[-.]', '/')) IS NULL
                     AND SAFE.PARSE_DATE('YYYY-MM-DD', ${column}) IS NULL
                THEN 'INVALID_DATE'
                ELSE 'VALID'
            END as validation_status,
            ${column} as original_value
        )
    `;
}

module.exports = {
    prepareSource,
    generateSourceUnion,
    generateTableName,
    md5Hash,
    generateCompositeId,
    formatTimestampSeconds,
    validateString,
    validateDate
};
