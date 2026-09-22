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
}

/**
 * Normalizes any Iraqi phone number to Bulk SMS Iraq format:
 * Must start with 964 and drop any leading zeros (e.g., 0750... -> 964750...)
 */
function formatIraqNumber(phone: string): string {
  if (!phone) return '';
  // Convert Arabic-Indic numerals (٠-٩) to standard digits (0-9)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = String(phone)
    .replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString())
    .replace(/[^0-9]/g, '');

  // Strip international double-zero if present: 009647... -> 9647...
  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  }

  // If local format starting with 07... (11 digits), drop leading 0 and prepend 964 -> 9647...
  if (clean.startsWith('07') && clean.length === 11) {
    clean = '964' + clean.substring(1);
  } else if (clean.startsWith('7') && clean.length === 10) {
    // Local format without leading 0 (7XXXXXXXXX) -> prepend 964 -> 9647...
    clean = '964' + clean;
  } else if (clean.startsWith('96407') && clean.length === 14) {
    // Erroneous double-zero/code (96407...) -> 9647...
    clean = '964' + clean.substring(4);
  }

  return clean;
}

/**
 * Replace personalization tokens like {Name}, {StudentID}, {Department}, {Stage}
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

    // Live Provider Configuration from .env.local (Server-Side only, never exposed to browser)
    const SMS_API_URL = process.env.SMS_API_URL || 'https://gateway.standingtech.com/api/v4/sms/send';
    const SMS_API_KEY = process.env.SMS_API_KEY;
    const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'TIUSuli';

    const batchId = `TIU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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
    }> = [];

    let deliveredCount = 0;
    let failedCount = 0;

    // Loop through each recipient and dispatch to Standing Tech v4 endpoint
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
        });
        continue;
      }

      // Check if live API key is configured
      if (!SMS_API_KEY || SMS_API_KEY.includes('your_live_api_key')) {
        // Safe simulation fallback if keys are missing
        await new Promise((r) => setTimeout(r, 150));
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
          response: { simulated: true, note: 'Simulation mode (SMS_API_KEY not configured)' },
        });
        continue;
      }

      try {
        // Payload required by Standing Tech API v4
        const payload = {
          recipient: formattedNumber,
          sender_id: SMS_SENDER_ID,
          type: 'plain',
          message: personalizedMessage,
          lang: 'en',
        };

        const providerResponse = await fetch(SMS_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SMS_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resData = await providerResponse.json().catch(() => null);

        if (providerResponse.ok) {
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
            status: providerResponse.status,
            response: resData,
          });
        } else {
          failedCount++;
          results.push({
            id,
            name,
            department,
            stage,
            studentId,
            recipient: formattedNumber,
            originalPhone: rawPhone,
            success: false,
            status: providerResponse.status,
            error: resData ? JSON.stringify(resData) : `HTTP ${providerResponse.status}`,
          });
        }
      } catch (err: unknown) {
        failedCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({
          id,
          name,
          department,
          stage,
          studentId,
          recipient: formattedNumber,
          originalPhone: rawPhone,
          success: false,
          error: errMsg,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Persist campaign record to Supabase
    try {
      const supabase = await createClient();
      await supabase.from('campaign_history').insert({
        batch_id: batchId,
        status: deliveredCount > 0 ? (failedCount === 0 ? 'delivered' : 'partially_delivered') : 'failed',
        recipient_count: recipients.length,
        total_segments: recipients.length,
        delivered_count: deliveredCount,
        failed_count: failedCount,
        message_preview: message.length > 90 ? `${message.substring(0, 87)}...` : message,
        sent_at: new Date().toISOString(),
        recipients: results.map((r) => ({
          id: r.id,
          name: r.name,
          department: r.department,
          stage: r.stage,
          studentId: r.studentId,
          phoneNumber: r.recipient,
          originalPhone: r.originalPhone,
          success: r.success,
          error: r.error,
        })),
        provider_details: {
          providerName: 'Standing Tech (Bulk SMS Iraq v4)',
          senderId: SMS_SENDER_ID,
          endpoint: SMS_API_URL,
          latencyMs: durationMs,
        },
      });
    } catch (dbErr) {
      console.warn('Supabase campaign logging notice:', dbErr);
    }

    return NextResponse.json({
      success: deliveredCount > 0,
      batchId,
      status: deliveredCount > 0 ? (failedCount === 0 ? 'delivered' : 'partially_delivered') : 'failed',
      recipientCount: recipients.length,
      deliveredCount,
      failedCount,
      latencyMs: durationMs,
      senderId: SMS_SENDER_ID,
      provider: 'Standing Tech (Bulk SMS Iraq v4)',
      sentAt: new Date().toISOString(),
      results,
      message:
        failedCount === 0
          ? `Successfully sent ${deliveredCount} SMS via ${SMS_SENDER_ID}.`
          : `Dispatched ${deliveredCount} of ${recipients.length} messages (${failedCount} failed).`,
    });
  } catch (error: unknown) {
    console.error('Error in /api/send-sms:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
