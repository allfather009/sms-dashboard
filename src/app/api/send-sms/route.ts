import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';

interface Recipient {
  id: string;
  name: string;
  phoneNumber: string;
  studentId?: string;
  department?: string;
  stage?: string;
}

interface SendSMSRequestBody {
  recipients: Recipient[];
  message: string;
}

// Calculate SMS segments (GSM 7-bit: 160 chars; UCS-2: 70 chars)
function calculateSegments(text: string): { segments: number; isUnicode: boolean } {
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ !"#%&'()*+,\-./0-9:;<=>?A-Z_a-z]*$/;
  const isUnicode = !gsmRegex.test(text);
  const len = text.length;

  if (len === 0) return { segments: 1, isUnicode: false };

  if (isUnicode) {
    return {
      segments: len <= 70 ? 1 : Math.ceil(len / 67),
      isUnicode: true,
    };
  } else {
    return {
      segments: len <= 160 ? 1 : Math.ceil(len / 153),
      isUnicode: false,
    };
  }
}

// Replace template placeholders like {Name}, {StudentID}, {Department}, {Stage}
function personalizeMessage(template: string, recipient: Recipient): string {
  return template
    .replace(/{Name}/gi, recipient.name || 'Recipient')
    .replace(/{FullName}/gi, recipient.name || 'Recipient')
    .replace(/{StudentID}/gi, recipient.studentId || '')
    .replace(/{Phone}/gi, recipient.phoneNumber || '')
    .replace(/{PhoneNumber}/gi, recipient.phoneNumber || '')
    .replace(/{Department}/gi, recipient.department || 'Department')
    .replace(/{Stage}/gi, recipient.stage || 'Stage');
}

export async function POST(request: NextRequest) {
  try {
    const body: SendSMSRequestBody = await request.json();
    const { recipients, message } = body;

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients provided. Please select at least one contact.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // Server-side Environment Variables (Securely stored on server, never sent to browser)
    const SMS_API_URL = process.env.SMS_API_URL;
    const SMS_API_KEY = process.env.SMS_API_KEY;
    const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'AIRSMS';

    const isLiveProviderConfigured = Boolean(
      SMS_API_URL &&
      SMS_API_KEY &&
      !SMS_API_URL.includes('your-provider') &&
      !SMS_API_KEY.includes('your_live_api_key')
    );

    const { segments } = calculateSegments(message);
    const totalSegments = segments * recipients.length;
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const startTime = Date.now();

    let deliveredCount = recipients.length;
    let failedCount = 0;
    let providerName = 'AirSMS Server Simulator';

    if (isLiveProviderConfigured) {
      providerName = new URL(SMS_API_URL!).hostname;

      // ========================================================================
      // LIVE SMS PROVIDER DISPATCH
      // ========================================================================
      // Formats the batch payload and sends via HTTP POST to your SMS provider
      const payload = {
        from: SMS_SENDER_ID,
        recipients: recipients.map((r) => {
          const norm = normalizeIraqPhoneNumber(r.phoneNumber);
          const normalizedPhone = norm.isValid ? norm.normalized : r.phoneNumber;
          return {
            to: normalizedPhone,
            text: personalizeMessage(message, r),
            recipientId: r.id,
            metadata: {
              name: r.name,
              studentId: r.studentId,
              department: r.department,
              stage: r.stage,
              phoneFormat: norm.isValid ? 'Bulk SMS Iraq (9647XXXXXXXXX)' : 'Unformatted',
            },
          };
        }),
      };

      const providerResponse = await fetch(SMS_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SMS_API_KEY}`,
          'X-Provider-Key': SMS_API_KEY!,
        },
        body: JSON.stringify(payload),
      });

      if (!providerResponse.ok) {
        const errText = await providerResponse.text().catch(() => 'Unknown provider error');
        console.error('SMS Provider HTTP Error:', providerResponse.status, errText);
        return NextResponse.json(
          {
            error: `SMS Provider rejected request (${providerResponse.status}): ${errText}`,
            batchId,
          },
          { status: 502 }
        );
      }
    } else {
      // ========================================================================
      // SIMULATED PROVIDER DISPATCH (2.0s realistic delay)
      // ========================================================================
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const durationMs = Date.now() - startTime;

    // Persist campaign record to Supabase if connected
    try {
      const supabase = await createClient();
      await supabase.from('campaign_history').insert({
        batch_id: batchId,
        status: 'delivered',
        recipient_count: recipients.length,
        total_segments: totalSegments,
        delivered_count: deliveredCount,
        failed_count: failedCount,
        message_preview: message.length > 100 ? `${message.substring(0, 97)}...` : message,
        sent_at: new Date().toISOString(),
        recipients: recipients.map((r) => ({
          id: r.id,
          name: r.name,
          phoneNumber: r.phoneNumber,
          department: r.department || '',
          stage: r.stage || '',
        })),
        provider_details: {
          providerName,
          latencyMs: durationMs,
          simulated: !isLiveProviderConfigured,
          endpointPlaceholder: SMS_API_URL || '(Simulation mode)',
        },
      });
    } catch (dbErr) {
      console.warn('Failed to record campaign history in Supabase:', dbErr);
    }

    return NextResponse.json({
      success: true,
      batchId,
      status: 'delivered',
      recipientCount: recipients.length,
      totalSegments,
      deliveredCount,
      failedCount,
      latencyMs: durationMs,
      isSimulated: !isLiveProviderConfigured,
      providerName,
      sentAt: new Date().toISOString(),
      message: isLiveProviderConfigured
        ? `Successfully sent ${totalSegments} SMS segment(s) to ${deliveredCount} contact(s) via ${providerName}.`
        : `Successfully dispatched to ${deliveredCount} contact(s) via carrier simulation (2s latency).`,
    });
  } catch (error: unknown) {
    console.error('Server error in /api/send-sms:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
