import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendCommPeakBatch,
  chunkArray,
  CommPeakMessage,
  COMMPEAK_BASE_URL,
  COMMPEAK_MAX_BATCH_SIZE,
} from '@/lib/commpeak';

type RecipientItem =
  | string
  | {
      id?: string;
      name?: string;
      phoneNumber?: string;
      phone?: string;
      studentId?: string;
      department?: string;
      stage?: string;
    };

interface SendSMSRequestBody {
  recipients: RecipientItem[];
  message: string;
  batchId?: string;
  skipCampaignLog?: boolean;
  gateway?: string;
  provider?: string;
  senderId?: string;
  iraqSmsApiKey?: string;
  commpeakApiKey?: string;
}

export type GatewayId = 'iraq_sms' | 'commpeak';

interface GatewayConfig {
  id: GatewayId;
  displayName: string;
  providerName: string;
  apiUrl: string;
  apiKey: string | undefined;
  senderId: string;
}

/**
 * Resolves configuration for the selected gateway.
 * Checks request body keys first (from user Settings), then env vars.
 */
function resolveGatewayConfig(body: SendSMSRequestBody): GatewayConfig {
  const requested = (body.gateway || body.provider || '').toLowerCase().trim();
  const isCommPeak = requested.includes('commpeak') || requested === 'secondary';

  const defaultSenderId = (body.senderId || '').trim().slice(0, 11);

  if (isCommPeak) {
    const key =
      body.commpeakApiKey ||
      process.env.NEXT_PUBLIC_COMMPEAK_API_KEY ||
      process.env.COMMPEAK_API_KEY;

    let apiUrl = process.env.COMMPEAK_API_URL || COMMPEAK_BASE_URL;
    if (apiUrl.includes('commpeak.com/textpeak') && !apiUrl.includes('/streams/')) {
      apiUrl = apiUrl.replace(/\/+$/, '') + '/streams/simple_send';
    }

    return {
      id: 'commpeak',
      displayName: 'Secondary (CommPeak)',
      providerName: 'CommPeak SMS Gateway',
      apiUrl,
      apiKey: key,
      senderId: defaultSenderId || process.env.COMMPEAK_SENDER_ID || '',
    };
  }

  // Default: Primary (Iraq SMS / Standing Tech v4)
  const key = body.iraqSmsApiKey || process.env.IRAQSMS_API_KEY || process.env.SMS_API_KEY;
  return {
    id: 'iraq_sms',
    displayName: 'Primary (Iraq SMS)',
    providerName: 'Standing Tech (Bulk SMS Iraq v4)',
    apiUrl: process.env.IRAQSMS_API_URL || process.env.SMS_API_URL || 'https://gateway.standingtech.com/api/v4/sms/send',
    apiKey: key,
    senderId: defaultSenderId || process.env.IRAQSMS_SENDER_ID || process.env.SMS_SENDER_ID || 'TIUSuli',
  };
}

/**
 * Normalizes any Iraqi phone number to Bulk SMS Iraq format:
 * Must start with 964 and drop any leading zeros (e.g., 0750... -> 964750...)
 */
function formatIraqNumber(phone: string): string {
  if (!phone) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = String(phone)
    .replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString())
    .replace(/[^0-9]/g, '');

  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  }

  if (clean.startsWith('07') && clean.length === 11) {
    clean = '964' + clean.substring(1);
  } else if (clean.startsWith('7') && clean.length === 10) {
    clean = '964' + clean;
  } else if (clean.startsWith('96407') && clean.length === 14) {
    clean = '964' + clean.substring(4);
  }

  return clean;
}

/**
 * Personalize template with recipient data
 */
function personalize(template: string, item: RecipientItem): string {
  if (typeof item === 'string') return template;

  return template
    .replace(/{Name}/gi, item.name || 'Student')
    .replace(/{FullName}/gi, item.name || 'Student')
    .replace(/{StudentID}/gi, item.studentId || '')
    .replace(/{Department}/gi, item.department || '')
    .replace(/{Stage}/gi, item.stage || '')
    .replace(/{Phone}/gi, item.phoneNumber || item.phone || '')
    .replace(/{PhoneNumber}/gi, item.phoneNumber || item.phone || '');
}

/**
 * Persists campaign history log to Supabase
 */
async function logCampaignToSupabase(params: {
  batchId: string;
  status: 'delivered' | 'partially_delivered' | 'failed';
  recipients: RecipientItem[];
  message: string;
  deliveredCount: number;
  failedCount: number;
  gatewayConfig: GatewayConfig;
  latencyMs: number;
  isSimulated: boolean;
  taskId?: string;
}) {
  try {
    const supabase = await createClient();
    const recipientSnapshot = params.recipients.map((r, i) => {
      if (typeof r === 'string') {
        return {
          id: `recip-${i}`,
          name: `Recipient ${i + 1}`,
          phoneNumber: r,
          department: 'General',
          stage: 'Stage 1',
        };
      }
      return {
        id: r.id || `recip-${i}`,
        name: r.name || `Recipient ${i + 1}`,
        phoneNumber: r.phoneNumber || r.phone || '',
        department: r.department || 'General',
        stage: r.stage || 'Stage 1',
      };
    });

    await supabase.from('campaign_history').insert({
      batch_id: params.batchId,
      status: params.status,
      recipient_count: params.recipients.length,
      total_segments: Math.ceil(params.message.length / 160) * params.recipients.length,
      delivered_count: params.deliveredCount,
      failed_count: params.failedCount,
      message_preview: params.message.slice(0, 160),
      recipients: recipientSnapshot,
      provider_details: {
        providerName: params.gatewayConfig.providerName,
        latencyMs: params.latencyMs,
        simulated: params.isSimulated,
        endpoint: params.gatewayConfig.apiUrl,
        gateway: params.gatewayConfig.displayName,
        taskId: params.taskId,
      },
      gateway_used: params.gatewayConfig.displayName,
      sent_at: new Date().toISOString(),
    });
  } catch (dbErr) {
    console.warn('Could not write campaign log to Supabase:', dbErr);
  }
}

/**
 * 1. Legacy Iraq SMS Function (Standing Tech Bulk SMS Iraq v4)
 * Strictly preserves the 5-second delay (throttling) loop between each message.
 */
async function executeIraqSmsBroadcast(
  body: SendSMSRequestBody,
  gatewayConfig: GatewayConfig,
  batchId: string,
  startTime: number
) {
  const { recipients, message, skipCampaignLog = false } = body;
  const isApiKeyMissingOrPlaceholder =
    !gatewayConfig.apiKey ||
    gatewayConfig.apiKey.includes('your_live_api_key') ||
    gatewayConfig.apiKey.includes('your-api-key') ||
    gatewayConfig.apiKey.includes('placeholder');

  const results: Array<{
    id?: string;
    name?: string;
    department?: string;
    stage?: string;
    studentId?: string;
    recipient: string;
    originalPhone: string;
    success: boolean;
    status?: number;
    response?: unknown;
    error?: string;
    gatewayUsed?: string;
  }> = [];

  let deliveredCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const item = recipients[i];
    const rawPhone = typeof item === 'string' ? item : item.phoneNumber || item.phone || '';
    const formattedNumber = formatIraqNumber(rawPhone);
    const personalizedMessage = personalize(message, item);
    const id = typeof item === 'object' ? item.id : undefined;
    const name = typeof item === 'object' ? item.name : undefined;
    const department = typeof item === 'object' ? item.department : undefined;
    const stage = typeof item === 'object' ? item.stage : undefined;
    const studentId = typeof item === 'object' ? item.studentId : undefined;

    // Strict 5-second delay before sending each message after the first one
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (!formattedNumber) {
      failedCount++;
      results.push({
        id,
        name,
        department,
        stage,
        studentId,
        recipient: '',
        originalPhone: rawPhone,
        success: false,
        error: 'Empty or invalid phone number',
        gatewayUsed: gatewayConfig.displayName,
      });
      continue;
    }

    if (isApiKeyMissingOrPlaceholder) {
      await new Promise((r) => setTimeout(r, 60));
      deliveredCount++;
      results.push({
        id,
        name,
        department,
        stage,
        studentId,
        recipient: formattedNumber,
        originalPhone: rawPhone,
        success: true,
        response: {
          simulated: true,
          gateway: gatewayConfig.displayName,
          senderId: gatewayConfig.senderId,
          note: `Simulated dispatch via ${gatewayConfig.displayName}`,
        },
        gatewayUsed: gatewayConfig.displayName,
      });
      continue;
    }

    try {
      const iraqSmsPayload = {
        recipient: formattedNumber,
        sender_id: gatewayConfig.senderId,
        type: 'plain',
        message: personalizedMessage,
      };

      const res = await fetch(gatewayConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayConfig.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(iraqSmsPayload),
      });

      let responseData: unknown = null;
      try {
        responseData = await res.json();
      } catch {
        responseData = await res.text();
      }

      if (!res.ok) {
        throw new Error(`Iraq SMS error (${res.status}): ${JSON.stringify(responseData)}`);
      }

      deliveredCount++;
      results.push({
        id,
        name,
        department,
        stage,
        studentId,
        recipient: formattedNumber,
        originalPhone: rawPhone,
        success: true,
        status: res.status,
        response: responseData,
        gatewayUsed: gatewayConfig.displayName,
      });
    } catch (sendErr: unknown) {
      failedCount++;
      const errorMessage = sendErr instanceof Error ? sendErr.message : 'Gateway request failed';
      console.error(`[${gatewayConfig.displayName}] Delivery error:`, errorMessage);
      results.push({
        id,
        name,
        department,
        stage,
        studentId,
        recipient: formattedNumber,
        originalPhone: rawPhone,
        success: false,
        error: errorMessage,
        gatewayUsed: gatewayConfig.displayName,
      });
    }
  }

  const latencyMs = Date.now() - startTime;
  const isOverallSuccess = failedCount === 0;
  const status = isOverallSuccess
    ? 'delivered'
    : deliveredCount > 0
    ? 'partially_delivered'
    : 'failed';

  if (!skipCampaignLog) {
    await logCampaignToSupabase({
      batchId,
      status,
      recipients,
      message,
      deliveredCount,
      failedCount,
      gatewayConfig,
      latencyMs,
      isSimulated: isApiKeyMissingOrPlaceholder,
    });
  }

  return NextResponse.json({
    success: true,
    batchId,
    status,
    recipientCount: recipients.length,
    deliveredCount,
    failedCount,
    latencyMs,
    senderId: gatewayConfig.senderId,
    provider: gatewayConfig.providerName,
    gateway: gatewayConfig.displayName,
    gateway_used: gatewayConfig.displayName,
    sentAt: new Date().toISOString(),
    results,
    message: `Successfully processed ${deliveredCount} of ${recipients.length} SMS via ${gatewayConfig.displayName} with 5s throttling.`,
  });
}

/**
 * 2. New CommPeak Batch Function
 * Integrates CommPeak OpenAPI V2.0.0 simple_send specification.
 * Chunks recipient array into batches of exactly 250 (the API maximum).
 * Constructs JSON payload in Batch mode: { sender, messages: [{ internal_id, recipient_phone, message_content }] }
 */
async function executeCommPeakBroadcast(
  body: SendSMSRequestBody,
  gatewayConfig: GatewayConfig,
  batchId: string,
  startTime: number
) {
  const { recipients, message, skipCampaignLog = false } = body;
  const isApiKeyMissingOrPlaceholder =
    !gatewayConfig.apiKey ||
    gatewayConfig.apiKey.includes('your_live_api_key') ||
    gatewayConfig.apiKey.includes('your-commpeak') ||
    gatewayConfig.apiKey.includes('placeholder');

  const results: Array<{
    id?: string;
    name?: string;
    department?: string;
    stage?: string;
    studentId?: string;
    recipient: string;
    originalPhone: string;
    success: boolean;
    status?: number;
    response?: unknown;
    error?: string;
    gatewayUsed?: string;
  }> = [];

  let deliveredCount = 0;
  let failedCount = 0;
  let lastTaskId: string | undefined = undefined;

  // Prepare normalized messages
  const preparedMessages: Array<{
    recipientItem: RecipientItem;
    commPeakItem: CommPeakMessage;
    rawPhone: string;
    formattedNumber: string;
  }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const item = recipients[i];
    const rawPhone = typeof item === 'string' ? item : item.phoneNumber || item.phone || '';
    const formattedNumber = formatIraqNumber(rawPhone);
    const personalizedMessage = personalize(message, item);
    const id = typeof item === 'object' ? item.id : undefined;
    const internalId = id || `recip-${i}-${Date.now().toString(36)}`;

    if (!formattedNumber) {
      failedCount++;
      results.push({
        id,
        name: typeof item === 'object' ? item.name : undefined,
        department: typeof item === 'object' ? item.department : undefined,
        stage: typeof item === 'object' ? item.stage : undefined,
        studentId: typeof item === 'object' ? item.studentId : undefined,
        recipient: '',
        originalPhone: rawPhone,
        success: false,
        error: 'Empty or invalid phone number',
        gatewayUsed: gatewayConfig.displayName,
      });
      continue;
    }

    preparedMessages.push({
      recipientItem: item,
      commPeakItem: {
        internal_id: internalId,
        recipient_phone: formattedNumber,
        message_content: personalizedMessage,
      },
      rawPhone,
      formattedNumber,
    });
  }

  // Chunk prepared messages into batches of exactly 250 (the API maximum)
  const batches = chunkArray(preparedMessages, COMMPEAK_MAX_BATCH_SIZE);

  for (const batch of batches) {
    const commPeakMessages = batch.map((b) => b.commPeakItem);

    try {
      const batchResult = await sendCommPeakBatch(commPeakMessages, {
        apiKey: gatewayConfig.apiKey,
        apiUrl: gatewayConfig.apiUrl,
        senderId: gatewayConfig.senderId,
      });

      if (batchResult.taskId) {
        lastTaskId = batchResult.taskId;
      }

      if (batchResult.success) {
        deliveredCount += batch.length;
        for (const b of batch) {
          const item = b.recipientItem;
          results.push({
            id: typeof item === 'object' ? item.id : undefined,
            name: typeof item === 'object' ? item.name : undefined,
            department: typeof item === 'object' ? item.department : undefined,
            stage: typeof item === 'object' ? item.stage : undefined,
            studentId: typeof item === 'object' ? item.studentId : undefined,
            recipient: b.formattedNumber,
            originalPhone: b.rawPhone,
            success: true,
            status: batchResult.status,
            response: {
              taskId: batchResult.taskId,
              batchStatus: '200 OK',
            },
            gatewayUsed: gatewayConfig.displayName,
          });
        }
      } else {
        failedCount += batch.length;
        const errMessage = batchResult.error || 'CommPeak batch request failed';
        console.error(`[CommPeak] Batch delivery error:`, errMessage);
        for (const b of batch) {
          const item = b.recipientItem;
          results.push({
            id: typeof item === 'object' ? item.id : undefined,
            name: typeof item === 'object' ? item.name : undefined,
            department: typeof item === 'object' ? item.department : undefined,
            stage: typeof item === 'object' ? item.stage : undefined,
            studentId: typeof item === 'object' ? item.studentId : undefined,
            recipient: b.formattedNumber,
            originalPhone: b.rawPhone,
            success: false,
            error: errMessage,
            gatewayUsed: gatewayConfig.displayName,
          });
        }
      }
    } catch (err: unknown) {
      failedCount += batch.length;
      const errMessage = err instanceof Error ? err.message : 'CommPeak batch exception';
      console.error(`[CommPeak] Batch exception:`, errMessage);
      for (const b of batch) {
        const item = b.recipientItem;
        results.push({
          id: typeof item === 'object' ? item.id : undefined,
          name: typeof item === 'object' ? item.name : undefined,
          department: typeof item === 'object' ? item.department : undefined,
          stage: typeof item === 'object' ? item.stage : undefined,
          studentId: typeof item === 'object' ? item.studentId : undefined,
          recipient: b.formattedNumber,
          originalPhone: b.rawPhone,
          success: false,
          error: errMessage,
          gatewayUsed: gatewayConfig.displayName,
        });
      }
    }
  }

  const latencyMs = Date.now() - startTime;
  const isOverallSuccess = failedCount === 0;
  const status = isOverallSuccess
    ? 'delivered'
    : deliveredCount > 0
    ? 'partially_delivered'
    : 'failed';

  if (!skipCampaignLog) {
    await logCampaignToSupabase({
      batchId,
      status,
      recipients,
      message,
      deliveredCount,
      failedCount,
      gatewayConfig,
      latencyMs,
      isSimulated: isApiKeyMissingOrPlaceholder,
      taskId: lastTaskId,
    });
  }

  const firstError = results.find((r) => !r.success && r.error)?.error;

  return NextResponse.json({
    success: isOverallSuccess,
    error: !isOverallSuccess ? (firstError || 'CommPeak Error: Broadcast transmission failed') : undefined,
    batchId,
    taskId: lastTaskId,
    status,
    recipientCount: recipients.length,
    deliveredCount,
    failedCount,
    latencyMs,
    senderId: gatewayConfig.senderId,
    provider: gatewayConfig.providerName,
    gateway: gatewayConfig.displayName,
    gateway_used: gatewayConfig.displayName,
    sentAt: new Date().toISOString(),
    results,
    message: isOverallSuccess
      ? `Successfully processed ${deliveredCount} of ${recipients.length} SMS via ${gatewayConfig.displayName} in batches of 250.`
      : firstError || `CommPeak broadcast failed (${failedCount} failed).`,
  }, {
    status: !isOverallSuccess && deliveredCount === 0 ? 400 : 200,
  });
}

/**
 * Routing Controller
 * Branches conditionally based on user's selected gateway:
 * - If 'iraq_sms' (Primary / IraqSMS): executes executeIraqSmsBroadcast with the 5-second delay loop.
 * - If 'commpeak' (Secondary / CommPeak): executes executeCommPeakBroadcast with chunks of 250.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendSMSRequestBody = await request.json();
    const { recipients, message } = body;

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided. Please select at least one recipient.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    const gatewayConfig = resolveGatewayConfig(body);
    const batchId =
      body.batchId ||
      `TIU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const startTime = Date.now();

    // Conditional Routing
    if (gatewayConfig.id === 'commpeak') {
      return await executeCommPeakBroadcast(body, gatewayConfig, batchId, startTime);
    } else {
      return await executeIraqSmsBroadcast(body, gatewayConfig, batchId, startTime);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Unhandled error in /api/send-sms:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
