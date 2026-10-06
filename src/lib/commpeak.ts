/**
 * CommPeak SMS Gateway Integration
 * OpenAPI V2.0.0 Specification (TextPeak simple_send stream)
 * Base URL: https://gw.commpeak.com/textpeak/streams/simple_send
 */

export const COMMPEAK_BASE_URL = 'https://gw.commpeak.com/textpeak/streams/simple_send';
export const COMMPEAK_MAX_BATCH_SIZE = 250;

export interface CommPeakMessage {
  internal_id: string;
  recipient_phone: string;
  message_content: string;
}

export interface CommPeakBatchPayload {
  sender?: string;
  messages: CommPeakMessage[];
}

export interface CommPeakMessageResult {
  internal_id?: string;
  message_uuid?: string;
  status?: string;
  error?: string;
  details?: string;
}

export interface CommPeakBatchResponse {
  status: boolean;
  task_id?: string;
  messages?: CommPeakMessageResult[];
  error?: string;
  details?: string;
}

export interface CommPeakSendBatchOptions {
  apiKey?: string;
  apiUrl?: string;
  senderId?: string;
}

export interface CommPeakSendBatchResult {
  success: boolean;
  status: number;
  taskId?: string;
  deliveredCount: number;
  failedCount: number;
  data: CommPeakBatchResponse;
  rawResponse?: unknown;
  error?: string;
}

/**
 * Splits an array of items into chunks of exactly `size` (API maximum: 250).
 */
export function chunkArray<T>(items: T[], size: number = COMMPEAK_MAX_BATCH_SIZE): T[][] {
  if (!items || items.length === 0) return [];
  const chunkSize = Math.max(1, Math.min(size, COMMPEAK_MAX_BATCH_SIZE));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

interface CommPeakErrorPayload {
  message?: string;
  messages?: Array<{
    details?: string;
    message?: string;
    error?: string;
  }>;
  details?: string;
  error?: string;
  error_description?: string;
  errors?: string | string[];
}

/**
 * Extracts exact error description from CommPeak JSON or text response.
 */
export function extractCommPeakErrorDetails(
  json: unknown,
  rawText: string,
  statusCode: number
): string {
  if (typeof json === 'object' && json !== null) {
    const obj = json as CommPeakErrorPayload;

    // 1. Message field (used in 401/403/ACL restrictions, e.g. "IP ACL restriction", "Not Authenticated: invalid token")
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }

    // 2. Individual message details inside messages array (e.g. sender "..." is not allowed sender)
    if (Array.isArray(obj.messages) && obj.messages.length > 0) {
      const first = obj.messages[0];
      if (typeof first?.details === 'string' && first.details.trim()) {
        return first.details.trim();
      }
      if (typeof first?.message === 'string' && first.message.trim()) {
        return first.message.trim();
      }
      if (typeof first?.error === 'string' && first.error.trim() && !first.error.startsWith('0x')) {
        return first.error.trim();
      }
    }

    // 3. Details field
    if (typeof obj.details === 'string' && obj.details.trim()) {
      return obj.details.trim();
    }

    // 4. Error field (skip hex codes like 0x1 unless no description exists)
    if (typeof obj.error === 'string' && obj.error.trim()) {
      if (obj.error.startsWith('0x') && typeof obj.error_description === 'string' && obj.error_description.trim()) {
        return obj.error_description.trim();
      }
      if (!obj.error.startsWith('0x')) {
        return obj.error.trim();
      }
    }

    if (typeof obj.error_description === 'string' && obj.error_description.trim()) {
      return obj.error_description.trim();
    }

    if (obj.errors) {
      if (typeof obj.errors === 'string') return obj.errors.trim();
      if (Array.isArray(obj.errors) && obj.errors.length > 0) return String(obj.errors[0]).trim();
    }

    return JSON.stringify(obj);
  }

  if (rawText && rawText.trim()) {
    if (rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
      const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
      const h1Match = rawText.match(/<h1>(.*?)<\/h1>/i);
      if (titleMatch?.[1]) return titleMatch[1].trim();
      if (h1Match?.[1]) return h1Match[1].trim();
    }
    return rawText.trim().substring(0, 300);
  }

  return `HTTP ${statusCode} response`;
}

/**
 * Sends a single batch of up to 250 messages to CommPeak simple_send API.
 * Uses OpenAPI V2.0.0 Batch mode payload:
 * {
 *   "sender": "TIUS", // optional top-level sender ID
 *   "messages": [
 *     {
 *       "internal_id": "...",
 *       "recipient_phone": "...",
 *       "message_content": "..."
 *     }
 *   ]
 * }
 */
export async function sendCommPeakBatch(
  messages: CommPeakMessage[],
  options?: CommPeakSendBatchOptions
): Promise<CommPeakSendBatchResult> {
  if (!messages || messages.length === 0) {
    return {
      success: true,
      status: 200,
      deliveredCount: 0,
      failedCount: 0,
      data: { status: true, messages: [] },
    };
  }

  // Ensure batch doesn't exceed CommPeak maximum limit of 250
  const batchMessages = messages.slice(0, COMMPEAK_MAX_BATCH_SIZE);

  // Resolve API Key: Options > NEXT_PUBLIC_COMMPEAK_API_KEY > COMMPEAK_API_KEY
  const apiKey = (
    options?.apiKey ||
    process.env.NEXT_PUBLIC_COMMPEAK_API_KEY ||
    process.env.COMMPEAK_API_KEY ||
    ''
  ).trim();

  // Resolve API URL
  let apiUrl = (
    options?.apiUrl ||
    process.env.COMMPEAK_API_URL ||
    COMMPEAK_BASE_URL
  ).trim();
  if (apiUrl.includes('commpeak.com/textpeak') && !apiUrl.includes('/streams/')) {
    apiUrl = apiUrl.replace(/\/+$/, '') + '/streams/simple_send';
  }

  // Resolve Sender ID
  const configuredSender = (
    options?.senderId !== undefined
      ? options.senderId
      : process.env.COMMPEAK_SENDER_ID || ''
  ).trim();

  // Simulation mode if key is missing or placeholder
  const isSimulation =
    !apiKey ||
    apiKey.includes('your_live_api_key') ||
    apiKey.includes('your-commpeak') ||
    apiKey.includes('placeholder');

  if (isSimulation) {
    const simulatedTaskId = `sim-commpeak-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    return {
      success: true,
      status: 200,
      taskId: simulatedTaskId,
      deliveredCount: batchMessages.length,
      failedCount: 0,
      data: {
        status: true,
        task_id: simulatedTaskId,
        messages: batchMessages.map((m, idx) => ({
          internal_id: m.internal_id,
          message_uuid: `sim-uuid-${idx}-${Date.now().toString(36)}`,
          status: 'ACCEPTED',
        })),
      },
    };
  }

  // Helper to execute the HTTP request to CommPeak
  const executeApiCall = async (includeSender: boolean) => {
    const payload: CommPeakBatchPayload = {
      messages: batchMessages.map((m) => ({
        internal_id: m.internal_id,
        recipient_phone: m.recipient_phone,
        message_content: m.message_content,
      })),
    };

    if (includeSender && configuredSender.length > 0) {
      payload.sender = configuredSender;
    }

    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : apiKey;

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: unknown) {
      console.error('[CommPeak] Network fetch failed:', networkErr);
      throw networkErr;
    }

    const statusCode = res.status;
    let rawBody = '';
    let json: CommPeakBatchResponse | string | null = null;

    try {
      rawBody = await res.text();
      try {
        json = JSON.parse(rawBody) as CommPeakBatchResponse;
      } catch {
        json = rawBody;
      }
    } catch (readErr) {
      console.error('[CommPeak] Failed to read response stream:', readErr);
      rawBody = '';
      json = null;
    }

    // Verbose logging if HTTP status indicates failure
    if (!res.ok) {
      const extractedErr = extractCommPeakErrorDetails(json, rawBody, statusCode);
      console.error(`[CommPeak] HTTP ${statusCode} ${res.statusText} Error Response:`, {
        status: statusCode,
        statusText: res.statusText,
        url: apiUrl,
        responseBody: json ?? rawBody,
        error: extractedErr,
      });
    }

    return { res, json, rawBody };
  };

  try {
    const hasCustomSender = Boolean(configuredSender && configuredSender.length > 0);
    let { res, json, rawBody } = await executeApiCall(hasCustomSender);

    // If CommPeak specifically rejects custom sender (e.g. sender is not an approved originator in CommPeak portal),
    // retry once with default stream originator
    const isSenderRejection =
      hasCustomSender &&
      json &&
      typeof json === 'object' &&
      (
        JSON.stringify(json).toLowerCase().includes('not allowed sender') ||
        JSON.stringify(json).toLowerCase().includes('invalid sender') ||
        JSON.stringify(json).toLowerCase().includes('originator')
      );

    if (isSenderRejection) {
      console.log('[CommPeak] Custom sender not permitted for this stream, retrying with default stream originator...');
      const retry = await executeApiCall(false);
      res = retry.res;
      json = retry.json;
      rawBody = retry.rawBody;
    }

    const responseStatus = res.status;
    const isCommPeakSuccess =
      res.ok &&
      typeof json === 'object' &&
      json !== null &&
      (json as CommPeakBatchResponse).status !== false;

    if (!isCommPeakSuccess) {
      const rawReason = extractCommPeakErrorDetails(json, rawBody, responseStatus);
      const formattedError = rawReason.toLowerCase().startsWith('commpeak error')
        ? rawReason
        : `CommPeak Error: ${rawReason}`;

      // Verbose server logging of the exact failure payload
      console.error(`[CommPeak] Dispatch Failed (${responseStatus}): ${formattedError}`, {
        status: responseStatus,
        statusText: res.statusText,
        payloadError: formattedError,
        rawResponse: json ?? rawBody,
      });

      return {
        success: false,
        status: responseStatus,
        deliveredCount: 0,
        failedCount: batchMessages.length,
        data:
          typeof json === 'object' && json !== null
            ? (json as CommPeakBatchResponse)
            : { status: false, error: formattedError },
        rawResponse: json ?? rawBody,
        error: formattedError,
      };
    }

    const batchData = json as CommPeakBatchResponse;
    const deliveredCount = batchMessages.length;

    return {
      success: true,
      status: responseStatus,
      taskId: batchData.task_id,
      deliveredCount,
      failedCount: 0,
      data: batchData,
      rawResponse: json ?? rawBody,
    };
  } catch (fatalErr: unknown) {
    const errMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    const formattedError = errMsg.toLowerCase().startsWith('commpeak error')
      ? errMsg
      : `CommPeak Error: ${errMsg}`;

    console.error(`[CommPeak] Fatal request exception:`, fatalErr);

    return {
      success: false,
      status: 500,
      deliveredCount: 0,
      failedCount: batchMessages.length,
      data: { status: false, error: formattedError },
      rawResponse: errMsg,
      error: formattedError,
    };
  }
}
