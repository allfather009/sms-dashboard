/**
 * ==============================================================================
 * SMS SERVICE INTEGRATION LAYER (MOCK & PRODUCTION READY)
 * ==============================================================================
 * This service handles sending bulk SMS messages to contact lists.
 * Currently running in SIMULATED MOCK MODE with realistic 2-second latency.
 *
 * HOW TO CONNECT YOUR REAL SMS PROVIDER:
 * ------------------------------------------------------------------------------
 * 1. Obtain your API credentials from your provider (e.g., Twilio, Infobip,
 *    MessageBird, Sinch, AWS SNS, or Vonage).
 * 2. Add them to your .env.local file:
 *      SMS_PROVIDER_API_KEY=your_live_api_key_here
 *      SMS_PROVIDER_API_SECRET=your_live_api_secret_here (if needed)
 *      SMS_PROVIDER_SENDER_ID=your_registered_alpha_id_or_phone_number
 *      SMS_PROVIDER_ENDPOINT=https://api.your-provider.com/v1/messages/bulk
 * 3. In the function `sendBulkSMS` below, replace the mock block with the
 *    provided production fetch/REST call block.
 * ==============================================================================
 */

import { Contact, SMSBatchResult } from '@/types';

// ============================================================================
// CONFIGURATION PLACEHOLDERS FOR YOUR SMS PROVIDER
// ============================================================================
export const SMS_CONFIG = {
  // Provider details - replace with your provider's name
  PROVIDER_NAME: 'TeleCom Global Connect (Pending Integration)',

  // Insert your SMS Provider's REST API endpoint URL here:
  // e.g., 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json'
  // e.g., 'https://api.infobip.com/sms/2/text/advanced'
  // e.g., 'https://rest.messagebird.com/messages'
  API_ENDPOINT: process.env.NEXT_PUBLIC_SMS_API_ENDPOINT || 'https://api.smsprovider.com/v2/messages/send-bulk',

  // Insert your API Key / Auth Token here:
  API_KEY: process.env.NEXT_PUBLIC_SMS_API_KEY || 'SK_LIVE_INSERT_YOUR_API_KEY_HERE',

  // Approved Sender ID / Originator / Shortcode:
  SENDER_ID: process.env.NEXT_PUBLIC_SMS_SENDER_ID || 'APPLE_SMS',

  // Default timeout in milliseconds
  REQUEST_TIMEOUT_MS: 15000,
};

/**
 * Calculates the number of SMS segments based on GSM-7 or UCS-2 encoding.
 * Standard SMS is 160 characters (GSM 7-bit).
 * Multi-part GSM SMS uses 153 chars per segment (due to UDH header).
 * If non-GSM characters (e.g. emoji or special characters) are detected,
 * encoding switches to UCS-2 (70 chars for single, 67 for multi-part).
 */
export function calculateSMSSegments(message: string): {
  charCount: number;
  segments: number;
  isUnicode: boolean;
  maxCharsPerSegment: number;
  remainingInSegment: number;
} {
  if (!message || message.length === 0) {
    return {
      charCount: 0,
      segments: 0,
      isUnicode: false,
      maxCharsPerSegment: 160,
      remainingInSegment: 160,
    };
  }

  // Basic GSM 7-bit character set test (Latin + standard punctuation)
  // Non-GSM characters (emojis, accented characters, Arabic, Cyrillic, Chinese, etc.)
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ !"#%&'()*+,\-./0-9:;<=>?A-Z_a-z]*$/;
  const isUnicode = !gsmRegex.test(message);

  const charCount = message.length;
  let segments = 1;
  let maxCharsPerSegment = 160;
  let remainingInSegment = 160;

  if (isUnicode) {
    // UCS-2 / UTF-16
    if (charCount <= 70) {
      segments = 1;
      maxCharsPerSegment = 70;
      remainingInSegment = 70 - charCount;
    } else {
      segments = Math.ceil(charCount / 67);
      maxCharsPerSegment = 67;
      remainingInSegment = segments * 67 - charCount;
    }
  } else {
    // GSM-7
    if (charCount <= 160) {
      segments = 1;
      maxCharsPerSegment = 160;
      remainingInSegment = 160 - charCount;
    } else {
      segments = Math.ceil(charCount / 153);
      maxCharsPerSegment = 153;
      remainingInSegment = segments * 153 - charCount;
    }
  }

  return {
    charCount,
    segments,
    isUnicode,
    maxCharsPerSegment,
    remainingInSegment,
  };
}

/**
 * Replaces dynamic variables in a template message for a specific contact.
 * Supported tokens: {Name}, {Phone}, {Department}, {Stage}
 */
export function renderPersonalizedMessage(template: string, contact: Contact): string {
  return template
    .replace(/{Name}/gi, contact.name || 'Recipient')
    .replace(/{Phone}/gi, contact.phoneNumber || '')
    .replace(/{PhoneNumber}/gi, contact.phoneNumber || '')
    .replace(/{Department}/gi, contact.department || 'Department')
    .replace(/{Stage}/gi, contact.stage || 'Stage');
}

/**
 * Sends a bulk SMS campaign to a list of contacts.
 *
 * In mock mode:
 * - Simulates realistic network delay (2000ms)
 * - Returns a comprehensive batch receipt with delivery statistics
 *
 * In production mode:
 * - Makes the live HTTPS POST request to your SMS provider's REST endpoint
 */
export async function sendBulkSMS(
  contacts: Contact[],
  message: string,
  onProgress?: (progressPercent: number) => void
): Promise<SMSBatchResult> {
  if (!contacts || contacts.length === 0) {
    throw new Error('No recipients selected for SMS broadcast.');
  }

  if (!message || message.trim().length === 0) {
    throw new Error('Message content cannot be empty.');
  }

  // Calculate total segments
  const { segments } = calculateSMSSegments(message);
  const totalSegments = segments * contacts.length;

  // --------------------------------------------------------------------------
  // [MOCK IMPLEMENTATION]
  // Simulates a 2000ms asynchronous API transaction with live progress ticks.
  // --------------------------------------------------------------------------
  const startTime = Date.now();

  // Progress tick 1: Connecting (25%)
  onProgress?.(25);
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Progress tick 2: Transmitting batches (65%)
  onProgress?.(65);
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Progress tick 3: Carrier verification (90%)
  onProgress?.(90);
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Finalize (100%)
  onProgress?.(100);

  const durationMs = Date.now() - startTime;
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  /*
  // ==========================================================================
  // [PRODUCTION INTEGRATION INSTRUCTIONS]
  // When your provider contract is ready, uncomment this block:
  // ==========================================================================
  
  const payload = {
    sender: SMS_CONFIG.SENDER_ID,
    messages: contacts.map(c => ({
      to: c.phoneNumber,
      text: renderPersonalizedMessage(message, c),
      customId: c.id,
      metadata: { department: c.department, stage: c.stage }
    }))
  };

  const response = await fetch(SMS_CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SMS_CONFIG.API_KEY}`,
      'X-Version': '2026-09-01'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`SMS Provider Error (${response.status}): ${errorData.message || response.statusText}`);
  }

  const liveResult = await response.json();
  // Map liveResult to SMSBatchResult structure
  // ==========================================================================
  */

  const result: SMSBatchResult = {
    batchId,
    status: 'delivered',
    recipientCount: contacts.length,
    totalSegments,
    deliveredCount: contacts.length,
    failedCount: 0,
    messagePreview: message,
    sentAt: new Date().toISOString(),
    recipients: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phoneNumber: c.phoneNumber,
      department: c.department,
      stage: c.stage,
    })),
    providerDetails: {
      providerName: SMS_CONFIG.PROVIDER_NAME,
      latencyMs: durationMs,
      simulated: true,
      endpointPlaceholder: SMS_CONFIG.API_ENDPOINT,
    },
  };

  return result;
}
