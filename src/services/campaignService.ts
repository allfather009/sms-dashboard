import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { SMSBatchResult } from '@/types';

export interface DatabaseCampaignRow {
  id: string;
  batch_id: string;
  status: 'delivered' | 'partially_delivered' | 'failed';
  recipient_count: number;
  total_segments: number;
  delivered_count: number;
  failed_count: number;
  message_preview: string;
  sent_at: string;
  recipients: Array<{
    id?: string;
    name?: string;
    phoneNumber?: string;
    originalPhone?: string;
    department?: string;
    stage?: string;
    studentId?: string;
    success?: boolean;
    error?: string;
  }>;
  provider_details: {
    providerName: string;
    latencyMs: number;
    simulated: boolean;
    endpointPlaceholder: string;
  };
  created_at: string;
}

export function mapRowToCampaign(row: DatabaseCampaignRow): SMSBatchResult {
  const batchId = row.batch_id || row.id || `batch-${Date.now()}`;
  return {
    batchId,
    status: row.status,
    recipientCount: row.recipient_count,
    totalSegments: row.total_segments,
    deliveredCount: row.delivered_count,
    failedCount: row.failed_count,
    messagePreview: row.message_preview,
    sentAt: row.sent_at,
    recipients: (row.recipients || []).map((r, idx) => ({
      id: r.id || `${batchId}-r-${idx}-${r.phoneNumber || r.originalPhone || ''}`,
      name: r.name || r.phoneNumber || r.originalPhone || `Recipient ${idx + 1}`,
      phoneNumber: r.phoneNumber || r.originalPhone || '',
      department: r.department || '',
      stage: r.stage || '',
    })),
    providerDetails: row.provider_details || {
      providerName: 'TIUS Direct Gateway',
      latencyMs: 2000,
      simulated: true,
      endpointPlaceholder: '',
    },
  };
}

/**
 * Fetches campaign history from Supabase campaign_history table
 */
export async function fetchCampaignsFromSupabase(): Promise<{
  data: SMSBatchResult[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('campaign_history')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const campaigns = (data || []).map((row) => mapRowToCampaign(row as DatabaseCampaignRow));
    return { data: campaigns, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: [], error: msg };
  }
}

/**
 * Saves a completed SMS batch dispatch to Supabase campaign_history table
 */
export async function saveCampaignToSupabase(batch: SMSBatchResult): Promise<{
  success: boolean;
  error: string | null;
}> {
  // First attempt saving via server-side route
  try {
    const res = await fetch('/api/campaigns/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      return { success: true, error: null };
    }
  } catch {
    // Fall back to client supabase direct insert
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const supabase = createClient();
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
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
