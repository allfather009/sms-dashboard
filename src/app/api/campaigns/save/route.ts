import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SMSBatchResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const batch: SMSBatchResult = await request.json();
    if (!batch || !batch.batchId) {
      return NextResponse.json({ error: 'Invalid batch data' }, { status: 400 });
    }

    const supabase = await createClient();
    const row = {
      batch_id: batch.batchId,
      status: batch.status,
      recipient_count: batch.recipientCount,
      total_segments: batch.totalSegments,
      delivered_count: batch.deliveredCount,
      failed_count: batch.failedCount,
      message_preview: batch.messagePreview,
      sent_at: batch.sentAt,
      recipients: batch.recipients,
      provider_details: batch.providerDetails,
    };

    const { error } = await supabase.from('campaign_history').insert(row);
    if (error) {
      console.warn('Server campaign save error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
