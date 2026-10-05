import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const key = body.commpeakApiKey || process.env.COMMPEAK_API_KEY;
    let apiUrl = process.env.COMMPEAK_API_URL || 'https://gw.commpeak.com/textpeak/streams/simple_send';
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

export async function POST(request: NextRequest) {
  try {
    const body: SendSMSRequestBody = await request.json();
    const { recipients, message, skipCampaignLog = false } = body;

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

    const isApiKeyMissingOrPlaceholder =
      !gatewayConfig.apiKey ||
      gatewayConfig.apiKey.includes('your_live_api_key') ||
      gatewayConfig.apiKey.includes('your-api-key') ||
      gatewayConfig.apiKey.includes('placeholder');

    for (const item of recipients) {
      const rawPhone = typeof item === 'string' ? item : item.phoneNumber || item.phone || '';
      const formattedNumber = formatIraqNumber(rawPhone);
      const personalizedMessage = personalize(message, item);
      const id = typeof item === 'object' ? item.id : undefined;
      const name = typeof item === 'object' ? item.name : undefined;
      const department = typeof item === 'object' ? item.department : undefined;
      const stage = typeof item === 'object' ? item.stage : undefined;
      const studentId = typeof item === 'object' ? item.studentId : undefined;

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

      // Simulation mode if key is missing
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

      // Live Gateway Dispatch using Strategy / Switch Pattern
      try {
        let responseStatus = 200;
        let responseData: unknown = null;

        switch (gatewayConfig.id) {
          case 'commpeak': {
            // CommPeak TextPeak Messaging API (gw.commpeak.com/textpeak/streams/simple_send)
            const isTextPeak = gatewayConfig.apiUrl.includes('textpeak');
            const authHeader = gatewayConfig.apiKey?.startsWith('Bearer ')
              ? gatewayConfig.apiKey
              : `${gatewayConfig.apiKey}`;

            const executeCommPeakCall = async (withSender: boolean) => {
              let payload: Record<string, unknown>;

              if (isTextPeak) {
                const msgObj: Record<string, string> = {
                  recipient_phone: formattedNumber,
                  message_content: personalizedMessage,
                };
                if (withSender && gatewayConfig.senderId && gatewayConfig.senderId.trim().length > 0) {
                  msgObj.sender = gatewayConfig.senderId.trim();
                }
                payload = { messages: [msgObj] };
              } else {
                payload = {
                  recipient: formattedNumber,
                  message: personalizedMessage,
                  ...(withSender && gatewayConfig.senderId ? { sender: gatewayConfig.senderId } : {}),
                };
              }

              const res = await fetch(gatewayConfig.apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              let json: Record<string, unknown> | string | null = null;
              try {
                json = await res.json();
              } catch {
                json = await res.text();
              }
              return { res, json };
            };

            const hasSender = Boolean(gatewayConfig.senderId && gatewayConfig.senderId.trim().length > 0);
            let { res, json } = await executeCommPeakCall(hasSender);

            // If CommPeak rejects the custom sender (e.g. sender is not an approved originator in CommPeak portal),
            // automatically retry once using the account's registered default stream sender
            if (
              hasSender &&
              json &&
              (JSON.stringify(json).includes('is not allowed sender') || (typeof json === 'object' && json !== null && 'status' in json && (json as { status: boolean }).status === false))
            ) {
              console.log('[CommPeak] Custom sender rejected or unapproved, retrying with stream default sender...');
              const retry = await executeCommPeakCall(false);
              res = retry.res;
              json = retry.json;
            }

            responseStatus = res.status;
            responseData = json;

            const isCommPeakSuccess =
              res.ok &&
              (typeof json !== 'object' ||
                json === null ||
                !('status' in json) ||
                (json as { status: boolean }).status !== false);

            if (!isCommPeakSuccess) {
              const details =
                (typeof json === 'object' &&
                  json !== null &&
                  'messages' in json &&
                  Array.isArray((json as { messages?: Array<{ details?: string }> }).messages) &&
                  (json as { messages: Array<{ details?: string }> }).messages[0]?.details) ||
                JSON.stringify(responseData);
              throw new Error(`CommPeak error (${res.status}): ${details}`);
            }
            break;
          }

          case 'iraq_sms':
          default: {
            // Standing Tech Bulk SMS Iraq v4
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

            responseStatus = res.status;
            try {
              responseData = await res.json();
            } catch {
              responseData = await res.text();
            }

            if (!res.ok) {
              throw new Error(`Iraq SMS error (${res.status}): ${JSON.stringify(responseData)}`);
            }
            break;
          }
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
          status: responseStatus,
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

    // Log to Supabase campaign_history with gateway_used
    if (!skipCampaignLog) {
      try {
        const supabase = await createClient();
        const recipientSnapshot = recipients.map((r, i) => {
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
          batch_id: batchId,
          status,
          recipient_count: recipients.length,
          total_segments: Math.ceil(message.length / 160) * recipients.length,
          delivered_count: deliveredCount,
          failed_count: failedCount,
          message_preview: message.slice(0, 160),
          recipients: recipientSnapshot,
          provider_details: {
            providerName: gatewayConfig.providerName,
            latencyMs,
            simulated: isApiKeyMissingOrPlaceholder,
            endpoint: gatewayConfig.apiUrl,
            gateway: gatewayConfig.displayName,
          },
          gateway_used: gatewayConfig.displayName,
          sent_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Could not write campaign log to Supabase:', dbErr);
      }
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
      message: `Successfully processed ${deliveredCount} of ${recipients.length} SMS via ${gatewayConfig.displayName} (${gatewayConfig.senderId}).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Unhandled error in /api/send-sms:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
