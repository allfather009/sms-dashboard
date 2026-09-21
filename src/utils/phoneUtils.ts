/**
 * ==============================================================================
 * BULK SMS IRAQ PHONE NUMBER NORMALIZATION UTILITY
 * ==============================================================================
 * Formats, cleans, and normalizes phone numbers into the Bulk SMS Iraq standard:
 * 9647XXXXXXXXX (13 digits: 964 country code + 7 mobile code + 9 digits)
 * ==============================================================================
 */

export interface PhoneNormalizationResult {
  raw: string;
  normalized: string;
  isValid: boolean;
  formatted: string; // e.g., +964 750 123 4567
  operator: 'Korek' | 'AsiaCell' | 'Zain Iraq' | 'Other Iraq' | 'Unknown';
  error?: string;
}

/**
 * Converts Arabic-Indic numerals (٠-٩) to standard Latin digits (0-9)
 */
export function convertArabicNumeralsToLatin(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
}

/**
 * Detects the Iraqi mobile network operator from the 3-digit mobile prefix
 */
export function detectIraqOperator(prefix: string): 'Korek' | 'AsiaCell' | 'Zain Iraq' | 'Other Iraq' | 'Unknown' {
  if (['750', '751', '752'].includes(prefix)) return 'Korek';
  if (['770', '771', '772', '773', '774'].includes(prefix)) return 'AsiaCell';
  if (['780', '781', '782', '783', '784', '785'].includes(prefix)) return 'Zain Iraq';
  if (prefix.startsWith('7')) return 'Other Iraq';
  return 'Unknown';
}

/**
 * Cleans and normalizes any phone number input into the Bulk SMS Iraq standard:
 * 9647XXXXXXXXX (13 digits)
 */
export function normalizeIraqPhoneNumber(input: string | undefined | null): PhoneNormalizationResult {
  if (!input) {
    return {
      raw: '',
      normalized: '',
      isValid: false,
      formatted: '',
      operator: 'Unknown',
      error: 'Phone number cannot be empty',
    };
  }

  const raw = String(input).trim();
  const latinDigitsOnly = convertArabicNumeralsToLatin(raw).replace(/[^0-9]/g, '');

  let normalized = '';

  if (latinDigitsOnly.startsWith('009647') && latinDigitsOnly.length === 15) {
    // 009647XXXXXXXXX -> 9647XXXXXXXXX
    normalized = latinDigitsOnly.substring(2);
  } else if (latinDigitsOnly.startsWith('9647') && latinDigitsOnly.length === 13) {
    // 9647XXXXXXXXX (already in bulk SMS format)
    normalized = latinDigitsOnly;
  } else if (latinDigitsOnly.startsWith('07') && latinDigitsOnly.length === 11) {
    // 07XXXXXXXXX (local format with leading 0) -> 9647XXXXXXXXX
    normalized = '964' + latinDigitsOnly.substring(1);
  } else if (latinDigitsOnly.startsWith('7') && latinDigitsOnly.length === 10) {
    // 7XXXXXXXXX (local format without leading 0) -> 9647XXXXXXXXX
    normalized = '964' + latinDigitsOnly;
  } else if (latinDigitsOnly.startsWith('96407') && latinDigitsOnly.length === 14) {
    // 96407XXXXXXXXX (erroneous double 0) -> 9647XXXXXXXXX
    normalized = '964' + latinDigitsOnly.substring(4);
  } else {
    // Invalid length or prefix
    return {
      raw,
      normalized: latinDigitsOnly,
      isValid: false,
      formatted: raw,
      operator: 'Unknown',
      error: 'Must be an Iraqi mobile number (e.g. 0750XXXXXXX, 0770XXXXXXX, 0780XXXXXXX)',
    };
  }

  // Validate strict Bulk SMS Iraq format: exactly 13 digits starting with 9647
  const isValid = /^9647[0-9]{9}$/.test(normalized);

  if (!isValid) {
    return {
      raw,
      normalized,
      isValid: false,
      formatted: raw,
      operator: 'Unknown',
      error: 'Invalid Iraqi mobile number length or prefix',
    };
  }

  const prefix = normalized.substring(3, 6); // e.g. 750, 770, 780
  const operator = detectIraqOperator(prefix);

  // Friendly human format: +964 7XX XXX XXXX
  const formatted = `+964 ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;

  return {
    raw,
    normalized,
    isValid: true,
    formatted,
    operator,
  };
}
