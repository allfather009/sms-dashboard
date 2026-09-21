import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { SMSTemplate } from '@/types';

export const FALLBACK_TEMPLATES: SMSTemplate[] = [
  {
    id: 'tmpl-1',
    title: 'Stage Status Update',
    description: 'Personalized update regarding current progress stage',
    content: 'Hi {Name}, your {Department} account is now transitioning into {Stage}. Please reply to this message if you have any questions.',
  },
  {
    id: 'tmpl-2',
    title: 'Consultation Reminder',
    description: 'Upcoming meeting or check-in reminder',
    content: 'Hello {Name}! Quick reminder of your scheduled consultation with the {Department} team tomorrow at 2:00 PM. Reply 1 to confirm.',
  },
  {
    id: 'tmpl-3',
    title: 'Milestone Completion',
    description: 'Celebratory notification for closed or advanced stages',
    content: 'Great news {Name}! We have completed the review process for your file in {Department}. We look forward to working with you.',
  },
  {
    id: 'tmpl-4',
    title: 'Action Item Request',
    description: 'Prompt recipient to submit required documentation',
    content: 'Attention {Name}: The {Department} team needs your updated confirmation to proceed with {Stage}. Please submit by end of day today.',
  },
];

export async function fetchTemplatesFromSupabase(): Promise<{
  data: SMSTemplate[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { data: FALLBACK_TEMPLATES, error: null };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sms_templates')
      .select('id, title, description, content')
      .order('created_at', { ascending: true });

    if (error) {
      return { data: FALLBACK_TEMPLATES, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: FALLBACK_TEMPLATES, error: null };
    }

    const templates: SMSTemplate[] = data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      content: row.content,
    }));

    return { data: templates, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: FALLBACK_TEMPLATES, error: msg };
  }
}
