function validateEmail(column, returnValidationStatus = true) {
  const emailRegex = "^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\\\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$";
  const cleanedColumn = `LOWER(TRIM(${column}))`;
  const emailParts = `SPLIT(${cleanedColumn}, '@')`;
  const domainPart = `${emailParts}[SAFE_OFFSET(1)]`;

  const basicFormatCheck = `
        CASE
            WHEN ${column} IS NULL THEN 'MISSING'
            WHEN TRIM(${column}) = '' THEN 'EMPTY'
            WHEN NOT REGEXP_CONTAINS(${cleanedColumn}, '@') THEN 'NO_AT_SYMBOL'
            ELSE NULL
        END
    `;

  const fullValidation = `
        CASE
            WHEN ${basicFormatCheck} IS NOT NULL THEN ${basicFormatCheck}
            WHEN ${domainPart} IS NULL OR LENGTH(${domainPart}) = 0 THEN 'NO_DOMAIN'
            WHEN NET.REG_DOMAIN('domain.' || ${domainPart}) IS NULL THEN 'INVALID_TLD'
            WHEN NOT REGEXP_CONTAINS(${cleanedColumn}, "${emailRegex}") THEN 'INVALID_FORMAT'
            ELSE 'VALID'
        END
    `;

  const emailValue = `CASE WHEN ${fullValidation} = 'VALID' THEN ${cleanedColumn} ELSE NULL END`;

  if (!returnValidationStatus) {
    return emailValue;
  }

  const emailDomain = `CASE WHEN ${fullValidation} = 'VALID' THEN SPLIT(${emailValue}, '@')[SAFE_OFFSET(1)] ELSE NULL END`;

  return `
        STRUCT(
            ${emailValue} AS value,
            ${fullValidation} AS validation_status,
            ${emailDomain} AS domain
        )
    `;
}

function validateMobile(column, returnValidationStatus = true) {
  const mobileRegex = "^(0?4|614)\\\\d{8}$";
  const prefixRegex = "^(04|614|4)";
  const cleanedColumn = `REGEXP_REPLACE(TRIM(${column}), r"[ \\-+]+", "")`;

  const valueCase = `
        CASE
            WHEN REGEXP_CONTAINS(${cleanedColumn}, "${mobileRegex}") THEN '+61' || RIGHT(${cleanedColumn}, 9)
            ELSE NULL
        END
    `;

  if (!returnValidationStatus) {
    return valueCase;
  }

  const statusCase = `
        CASE
            WHEN ${column} IS NULL THEN 'MISSING'
            WHEN TRIM(${column}) = '' THEN 'EMPTY'
            WHEN REGEXP_CONTAINS(${column}, "[A-Za-z]") THEN 'CONTAINS_LETTERS'
            WHEN NOT REGEXP_CONTAINS(${cleanedColumn}, "${prefixRegex}") THEN 'WRONG_PREFIX'
            WHEN NOT REGEXP_CONTAINS(${cleanedColumn}, "${mobileRegex}") THEN 'INVALID_FORMAT'
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

const standardiseAge = (dateColumn, ageColumn = null, currentDate = 'CURRENT_DATE', returnValidationStatus = true) => {
  // Constants
  const MAX_AGE = 120;

  // Helper to generate age group CASE statement with the input age expression
  const getAgeGroup = (ageExpr) => `
    CASE
      WHEN ${ageExpr} < 18 THEN 'Under 18'
      WHEN ${ageExpr} BETWEEN 18 AND 24 THEN '18-24'
      WHEN ${ageExpr} BETWEEN 25 AND 34 THEN '25-34'
      WHEN ${ageExpr} BETWEEN 35 AND 44 THEN '35-44'
      WHEN ${ageExpr} BETWEEN 45 AND 54 THEN '45-54'
      WHEN ${ageExpr} BETWEEN 55 AND 64 THEN '55-64'
      ELSE '65+'
    END
  `;

  // Handle NULL date column case
  if (dateColumn === 'NULL') {
    const hasValidAge = `
      ${ageColumn} IS NOT NULL AND
      SAFE_CAST(${ageColumn} AS INT64) IS NOT NULL AND
      SAFE_CAST(${ageColumn} AS INT64) >= 0 AND
      SAFE_CAST(${ageColumn} AS INT64) <= ${MAX_AGE}
    `;

    const valueCase = `
      CASE WHEN ${hasValidAge} THEN
        STRUCT(
          CAST(${ageColumn} AS INT64) as exact_age,
          ${getAgeGroup(`CAST(${ageColumn} AS INT64)`)} as age_group
        )
      ELSE NULL END
    `;

    if (!returnValidationStatus) return valueCase;

    const statusCase = `
      CASE
        WHEN ${ageColumn} IS NULL THEN 'MISSING'
        WHEN SAFE_CAST(${ageColumn} AS INT64) IS NULL THEN 'INVALID_AGE_FORMAT'
        WHEN CAST(${ageColumn} AS INT64) < 0 THEN 'NEGATIVE_AGE'
        WHEN CAST(${ageColumn} AS INT64) > ${MAX_AGE} THEN 'AGE_TOO_HIGH'
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

  // Handle date-based age calculation
  const resolvedCurrentDate = currentDate === 'CURRENT_DATE' ? 'CURRENT_DATE' : `DATE('2024-11-19')`;

  const ageFromDate = `
    DATETIME_DIFF(
      ${resolvedCurrentDate},
      DATETIME(${dateColumn}),
      YEAR
    )
  `;

  const getYearOfBirth = `EXTRACT(YEAR FROM DATETIME(${dateColumn}))`;
  const getCurrentYear = `EXTRACT(YEAR FROM ${resolvedCurrentDate})`;
  const getYearOfBirthFromAge = `(${getCurrentYear} - CAST(${ageColumn} AS INT64))`;

  const hasValidDate = `
    ${dateColumn} IS NOT NULL AND
    ${dateColumn} <= ${resolvedCurrentDate} AND
    ${ageFromDate} <= ${MAX_AGE}
  `;

  const hasValidAge = `
    ${ageColumn} IS NOT NULL AND
    SAFE_CAST(${ageColumn} AS INT64) IS NOT NULL AND
    SAFE_CAST(${ageColumn} AS INT64) >= 0 AND
    SAFE_CAST(${ageColumn} AS INT64) <= ${MAX_AGE}
  `;

  const valueCase = `
    CASE
      WHEN ${hasValidDate} THEN
        STRUCT(
          ${ageFromDate} as exact_age,
          ${getAgeGroup(ageFromDate)} as age_group,
          ${getYearOfBirth} as year_of_birth
        )
      WHEN ${hasValidAge} THEN
        STRUCT(
          CAST(${ageColumn} AS INT64) as exact_age,
          ${getAgeGroup(`CAST(${ageColumn} AS INT64)`)} as age_group,
          ${getYearOfBirthFromAge} as year_of_birth
        )
      ELSE NULL
    END
  `;

  if (!returnValidationStatus) return valueCase;

  const statusCase = `
    CASE
      WHEN ${dateColumn} IS NOT NULL THEN
        CASE
          WHEN ${dateColumn} > ${resolvedCurrentDate} THEN 'FUTURE_DATE'
          WHEN ${ageFromDate} > ${MAX_AGE} THEN 'AGE_TOO_HIGH'
          WHEN ${hasValidDate} THEN 'VALID'
          ELSE 'MISSING'
        END
      WHEN ${ageColumn} IS NULL THEN 'MISSING'
      WHEN SAFE_CAST(${ageColumn} AS INT64) IS NULL THEN 'INVALID_AGE_FORMAT'
      WHEN CAST(${ageColumn} AS INT64) < 0 THEN 'NEGATIVE_AGE'
      WHEN CAST(${ageColumn} AS INT64) > ${MAX_AGE} THEN 'AGE_TOO_HIGH'
      ELSE 'VALID'
    END
  `;

  return `
    STRUCT(
      ${valueCase} as value,
      ${statusCase} as validation_status
    )
  `;
};

function standardiseGender(column, returnValidationStatus = true) {
  const cleanedColumn = `UPPER(TRIM(${column}))`;

  const hasValidFormat = `
    REGEXP_CONTAINS(${cleanedColumn}, 
      r"^(M|MALE|MAN|MEN|BOY|B|F|FEMALE|WOMAN|WOMEN|GIRL|G|N|NB|NON|NONBINARY|NON-BINARY|X|P|PNTS|PREFER|NOTSPECIFIED|NOT|NA)$"
    )
  `;

  const valueCase = `
    CASE
      WHEN ${column} IS NULL THEN NULL
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(M|MALE|MAN|MEN|BOY|B)$") THEN 'MALE'
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(F|FEMALE|WOMAN|WOMEN|GIRL|G)$") THEN 'FEMALE'
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(N|NB|NON|NONBINARY|NON-BINARY|X)$") THEN 'NON_BINARY'
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(P|PNTS|PREFER|NOTSPECIFIED|NOT|NA)$") THEN 'PREFER_NOT_TO_SAY'
      ELSE NULL
    END
  `;

  if (!returnValidationStatus) {
    return valueCase;
  }

  const statusCase = `
    CASE
      WHEN ${column} IS NULL THEN 'MISSING'
      WHEN TRIM(${column}) = '' THEN 'EMPTY'
      WHEN NOT ${hasValidFormat} THEN 'UNRECOGNIZED_FORMAT'
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

function standardiseSubscriptionStatus(column, returnValidationStatus = true) {
  const cleanedColumn = `UPPER(TRIM(${column}))`;

  const hasValidFormat = `
    REGEXP_CONTAINS(${cleanedColumn}, 
      r"^(1|Y|YES|TRUE|T|SUBSCRIBED|ACTIVE|OPT-IN|OPTIN|0|N|NO|FALSE|F|UNSUBSCRIBED|INACTIVE|OPT-OUT|OPTOUT|2|PENDING|DOUBLE|VERIFICATION|VERIFY)$"
    )
  `;

  const valueCase = `
    CASE
      WHEN ${column} IS NULL THEN NULL
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(1|Y|YES|TRUE|T|SUBSCRIBED|ACTIVE|OPT-IN|OPTIN)$") THEN 'SUBSCRIBED'
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(0|N|NO|FALSE|F|UNSUBSCRIBED|INACTIVE|OPT-OUT|OPTOUT)$") THEN 'UNSUBSCRIBED'
      WHEN REGEXP_CONTAINS(${cleanedColumn}, r"^(2|PENDING|DOUBLE|VERIFICATION|VERIFY)$") THEN 'PENDING'
      ELSE NULL
    END
  `;

  if (!returnValidationStatus) {
    return valueCase;
  }

  const statusCase = `
    CASE
      WHEN ${column} IS NULL THEN 'MISSING'
      WHEN TRIM(${column}) = '' THEN 'EMPTY'
      WHEN NOT ${hasValidFormat} THEN 'UNRECOGNIZED_STATUS'
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

function standardiseAddress(address1, address2, address3, suburb, city, postcode, state, country, returnValidationStatus = true) {
  const cleanSpace = (col) => `TRIM(REGEXP_REPLACE(COALESCE(${col}, ''), r'[\\s\\r\\n]+', ' '))`;
  const cleanState = (col) => `UPPER(TRIM(COALESCE(${col}, '')))`;
  const setNullIfEmpty = (col) => `CASE WHEN TRIM(${col}) = '' THEN NULL ELSE ${col} END`;
  const cleanCountry = (col) => `INITCAP(TRIM(COALESCE(${setNullIfEmpty(col)}, 'AUSTRALIA')))`;

  const requiredFieldCheck = `
    COALESCE(${address1}, ${suburb}) IS NOT NULL
  `;

  const postcodeCheck = `
    CASE 
      WHEN ${postcode} IS NULL THEN TRUE
      WHEN TRIM(${postcode}) = '' THEN TRUE
      ELSE REGEXP_CONTAINS(${postcode}, r'^\\d{4}$')
    END
  `;

  const stateCheck = `
    CASE 
      WHEN ${state} IS NULL THEN TRUE
      WHEN TRIM(${state}) = '' THEN TRUE
      ELSE REGEXP_CONTAINS(UPPER(TRIM(${state})), r'^(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)$')
    END
  `;

  const validationStatus = `
    CASE
      WHEN NOT ${requiredFieldCheck} THEN 'MISSING'
      WHEN NOT ${postcodeCheck} THEN 'INVALID_POSTCODE'
      WHEN NOT ${stateCheck} THEN 'INVALID_STATE'
      ELSE 'VALID'
    END
  `;

  const addressStruct = `
    STRUCT(
      CASE 
        WHEN (${validationStatus}) IN ('INVALID_POSTCODE', 'INVALID_STATE') THEN NULL
        ELSE NULLIF(TRIM(CONCAT(
          COALESCE(${cleanSpace(address1)}, ''),
          IF(LENGTH(TRIM(COALESCE(${address2}, ''))) > 0, CONCAT('\\n', ${cleanSpace(address2)}), ''),
          IF(LENGTH(TRIM(COALESCE(${address3}, ''))) > 0, CONCAT('\\n', ${cleanSpace(address3)}), ''),
          IF(LENGTH(TRIM(COALESCE(${suburb}, ''))) > 0, CONCAT('\\n', ${cleanSpace(suburb)}), ''),
          IF(LENGTH(TRIM(COALESCE(${city}, ''))) > 0, CONCAT('\\n', ${cleanSpace(city)}), ''),
          IF(LENGTH(TRIM(COALESCE(${state}, ''))) > 0, CONCAT(' ', ${cleanState(state)}), ''),
          IF(LENGTH(TRIM(COALESCE(${postcode}, ''))) > 0, CONCAT(' ', ${postcode}), ''),
          CONCAT('\\n', ${cleanCountry(country)})
        )), '')
      END as full_address,
      CASE 
        WHEN (${validationStatus}) IN ('INVALID_POSTCODE', 'INVALID_STATE') THEN NULL
        ELSE 
          CASE
            WHEN ${suburb} IS NOT NULL THEN
              CONCAT(
                ${cleanSpace(suburb)},
                CASE WHEN ${postcode} IS NOT NULL THEN CONCAT(' ', ${postcode}) ELSE '' END,
                CASE WHEN ${city} IS NOT NULL THEN CONCAT(', ', ${cleanSpace(city)}) ELSE '' END,
                CASE WHEN ${state} IS NOT NULL THEN CONCAT(', ', ${cleanState(state)}) ELSE '' END,
                ', ', ${cleanCountry(country)}
              )
            WHEN ${city} IS NOT NULL THEN
              CONCAT(
                ${cleanSpace(city)},
                CASE WHEN ${state} IS NOT NULL THEN CONCAT(', ', ${cleanState(state)}) ELSE '' END,
                ', ', ${cleanCountry(country)}
              )
            WHEN ${state} IS NOT NULL THEN
              CONCAT(
                ${cleanState(state)}, ', ', ${cleanCountry(country)}
              )
            ELSE ${cleanCountry(country)}
          END
      END as suburb_level,
      CASE 
        WHEN (${validationStatus}) IN ('INVALID_POSTCODE', 'INVALID_STATE') THEN NULL
        ELSE 
          CASE
            WHEN ${city} IS NOT NULL THEN
              CONCAT(
                ${cleanSpace(city)},
                CASE WHEN ${state} IS NOT NULL THEN CONCAT(', ', ${cleanState(state)}) ELSE '' END,
                ', ', ${cleanCountry(country)}
              )
            WHEN ${state} IS NOT NULL THEN
              CONCAT(${cleanState(state)}, ', ', ${cleanCountry(country)})
            ELSE ${cleanCountry(country)}
          END
      END as city_level,
      CASE 
        WHEN (${validationStatus}) IN ('INVALID_POSTCODE', 'INVALID_STATE') THEN NULL
        ELSE 
          CASE
            WHEN ${state} IS NOT NULL THEN
              CONCAT(${cleanState(state)}, ', ', ${cleanCountry(country)})
            ELSE ${cleanCountry(country)}
          END
      END as state_level,
      CASE 
        WHEN (${validationStatus}) IN ('INVALID_POSTCODE', 'INVALID_STATE') THEN NULL
        ELSE ${cleanCountry(country)}
      END as country_level
    )
  `;

  const accuracyLevel = `
    CASE
      WHEN ${address1} IS NOT NULL THEN 'ADDRESS_OUTPUT'
      WHEN ${suburb} IS NOT NULL THEN 'SUBURB_OUTPUT'
      WHEN ${city} IS NOT NULL THEN 'CITY_OUTPUT'
      WHEN ${state} IS NOT NULL THEN 'STATE_OUTPUT'
      WHEN ${country} IS NOT NULL THEN 'COUNTRY_OUTPUT'
      ELSE NULL
    END
  `;

  if (!returnValidationStatus) {
    return addressStruct;
  }

  return `
    STRUCT(
      ${addressStruct} AS value,
      ${validationStatus} AS validation_status,
      ${accuracyLevel} AS location_accuracy
    )
  `;
}

module.exports = {
  validateEmail,
  validateMobile,
  standardiseAge,
  standardiseGender,
  standardiseAddress,
  standardiseSubscriptionStatus
};