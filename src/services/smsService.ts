/**
 * ==============================================================================
 * SMS SERVICE INTEGRATION LAYER
 * ==============================================================================
 * Dispatches outbound bulk SMS requests securely via Next.js server-side
 * route handler (/api/send-sms) so provider API keys are never exposed
 * to the client browser.
 * ==============================================================================
 */

import { Contact, SMSBatchResult } from '@/types';

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

  // Basic GSM 7-bit character set test
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
    .replace(/{FullName}/gi, contact.name || 'Recipient')
    .replace(/{StudentID}/gi, contact.studentId || '')
    .replace(/{Phone}/gi, contact.phoneNumber || '')
    .replace(/{PhoneNumber}/gi, contact.phoneNumber || '')
    .replace(/{Department}/gi, contact.department || 'Department')
    .replace(/{Stage}/gi, contact.stage || 'Stage');
}

/**
 * Sends a bulk SMS campaign via the server-side API route (/api/send-sms)
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

  // Visual progress increments for UI responsiveness
  let currentProgress = 20;
  onProgress?.(currentProgress);

  const progressTimer = setInterval(() => {
    currentProgress = Math.min(currentProgress + 20, 85);
    onProgress?.(currentProgress);
  }, 400);

  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          phoneNumber: c.phoneNumber,
          department: c.department,
          stage: c.stage,
        })),
        message,
      }),
    });

    clearInterval(progressTimer);
    onProgress?.(100);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server rejected transmission (${response.status})`);
    }

    const result: SMSBatchResult = {
      batchId: data.batchId,
      status: data.status || 'delivered',
      recipientCount: data.recipientCount,
      totalSegments: data.totalSegments,
      deliveredCount: data.deliveredCount,
      failedCount: data.failedCount || 0,
      messagePreview: message,
      sentAt: data.sentAt || new Date().toISOString(),
      recipients: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        department: c.department,
        stage: c.stage,
      })),
      providerDetails: {
        providerName: data.providerName || 'TIUS Dispatcher',
        latencyMs: data.latencyMs || 2000,
        simulated: Boolean(data.isSimulated),
        endpointPlaceholder: '/api/send-sms',
      },
    };

    return result;
  } catch (error) {
    clearInterval(progressTimer);
    throw error;
  }
}
