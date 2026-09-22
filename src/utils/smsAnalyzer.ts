/**
 * ==============================================================================
 * SMART SMS CONTENT & COST ANALYZER
 * ==============================================================================
 * Analyzes SMS message encoding (GSM-7 vs Unicode/UCS-2) and calculates segment
 * counts and cost implications for university bulk broadcasts.
 *
 * Telecom Rules:
 * - Standard GSM-7 (Plain English): 160 characters for single segment.
 *   Multi-part GSM-7 messages use 153 characters per segment (due to 7-byte UDH header).
 * - Unicode (Arabic, Kurdish, Emojis, etc.): 70 characters for single segment.
 *   Multi-part Unicode messages use 67 characters per segment.
 * ==============================================================================
 */

// Comprehensive GSM 03.38 7-bit character set test (basic character set & extension table)
const GSM_7_REGEX = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ !"#%&'()*+,\-./0-9:;<=>?A-Z_a-zäöñüàÄÖÑÜ§]*$/;

/**
 * Detects whether a string contains any non-GSM Unicode characters
 * such as Arabic, Kurdish, Cyrillic, Chinese, or Emojis.
 */
export function containsUnicode(text: string): boolean {
  if (!text || text.length === 0) return false;
  return !GSM_7_REGEX.test(text);
}

export interface SMSAnalysisResult {
  charCount: number;
  segments: number;
  isUnicode: boolean;
  maxCharsCurrentSegment: number;
  remainingInSegment: number;
  isApproachingLimit: boolean; // within 10 characters of segment boundary
  isMultiSegment: boolean; // segments > 1 (multiplied credit costs)
  costMultiplier: number;
  statusColor: 'default' | 'warning' | 'danger';
  displayText: string;
  encodingLabel: string;
}

/**
 * Analyzes SMS message content, returning live character counts,
 * segments, encoding detection, cost multiplier, and UI color states.
 */
export function analyzeSMSContent(message: string): SMSAnalysisResult {
  if (!message || message.length === 0) {
    return {
      charCount: 0,
      segments: 0,
      isUnicode: false,
      maxCharsCurrentSegment: 160,
      remainingInSegment: 160,
      isApproachingLimit: false,
      isMultiSegment: false,
      costMultiplier: 1,
      statusColor: 'default',
      displayText: '0 chars • 0 Segments',
      encodingLabel: 'GSM-7 (Standard)',
    };
  }

  const isUnicode = containsUnicode(message);
  const charCount = message.length;

  let segments = 1;
  let maxCharsCurrentSegment = isUnicode ? 70 : 160;
  let remainingInSegment = 0;

  if (isUnicode) {
    if (charCount <= 70) {
      segments = 1;
      maxCharsCurrentSegment = 70;
      remainingInSegment = 70 - charCount;
    } else {
      segments = Math.ceil(charCount / 67);
      maxCharsCurrentSegment = segments * 67;
      remainingInSegment = segments * 67 - charCount;
    }
  } else {
    if (charCount <= 160) {
      segments = 1;
      maxCharsCurrentSegment = 160;
      remainingInSegment = 160 - charCount;
    } else {
      segments = Math.ceil(charCount / 153);
      maxCharsCurrentSegment = segments * 153;
      remainingInSegment = segments * 153 - charCount;
    }
  }

  // Warning if within 10 characters of the current segment limit
  const isApproachingLimit = remainingInSegment <= 10 && remainingInSegment >= 0;
  const isMultiSegment = segments > 1;

  // Status color logic:
  // - Gray by default (1 segment and > 10 chars remaining)
  // - Orange/yellow when within 10 characters of segment limit
  // - Red when crossing into a new segment that doubles (or triples) the cost
  let statusColor: 'default' | 'warning' | 'danger' = 'default';
  if (isMultiSegment) {
    statusColor = 'danger'; // Red when crossed into new segment
  } else if (isApproachingLimit) {
    statusColor = 'warning'; // Orange/yellow when within 10 chars
  } else {
    statusColor = 'default'; // Gray by default
  }

  // Formatted display text according to requirements:
  // e.g., "145 chars • 1 Segment" or "80 chars • 2 Segments (Costs 2x credits)"
  const segmentWord = segments === 1 ? 'Segment' : 'Segments';
  const costSuffix = isMultiSegment ? ` (Costs ${segments}x credits)` : '';
  const displayText = `${charCount} chars • ${segments} ${segmentWord}${costSuffix}`;

  const encodingLabel = isUnicode
    ? 'Unicode (Arabic / Kurdish / Emoji • 70 chars/seg)'
    : 'GSM-7 (Standard English • 160 chars/seg)';

  return {
    charCount,
    segments,
    isUnicode,
    maxCharsCurrentSegment,
    remainingInSegment,
    isApproachingLimit,
    isMultiSegment,
    costMultiplier: segments,
    statusColor,
    displayText,
    encodingLabel,
  };
}
