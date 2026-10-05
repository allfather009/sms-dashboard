import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppSettings, DeliveryGateway } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultSenderId: process.env.SMS_SENDER_ID || process.env.IRAQSMS_SENDER_ID || 'TIUSuli',
  defaultGateway: (process.env.DEFAULT_SMS_GATEWAY as DeliveryGateway) || 'iraq_sms',
  iraqSmsApiKey: process.env.IRAQSMS_API_KEY || process.env.SMS_API_KEY || '',
  commpeakApiKey: process.env.COMMPEAK_API_KEY || '',
  iraqSmsApiUrl: process.env.IRAQSMS_API_URL || process.env.SMS_API_URL || 'https://gateway.standingtech.com/api/v4/sms/send',
  commpeakApiUrl: process.env.COMMPEAK_API_URL || 'https://api.commpeak.com/v1/sms/send',
};

// In-memory fallback if Supabase is offline or table is unavailable
let serverMemorySettings: AppSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('settings')
      .eq('id', 'general')
      .maybeSingle();

    if (!error && data?.settings) {
      const merged: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...data.settings,
        defaultSenderId: (data.settings.defaultSenderId || DEFAULT_SETTINGS.defaultSenderId).slice(0, 11),
      };
      serverMemorySettings = merged;
      return NextResponse.json({ success: true, settings: merged });
    }

    return NextResponse.json({ success: true, settings: serverMemorySettings });
  } catch (err) {
    console.warn('Error reading settings from Supabase, using server memory/env:', err);
    return NextResponse.json({ success: true, settings: serverMemorySettings });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<AppSettings> = await request.json();

    const senderId = (body.defaultSenderId || serverMemorySettings.defaultSenderId || 'TIUSuli')
      .trim()
      .slice(0, 11);

    const cleanSettings: AppSettings = {
      defaultSenderId: senderId,
      defaultGateway: body.defaultGateway === 'commpeak' ? 'commpeak' : 'iraq_sms',
      iraqSmsApiKey: (body.iraqSmsApiKey !== undefined ? body.iraqSmsApiKey : serverMemorySettings.iraqSmsApiKey).trim(),
      commpeakApiKey: (body.commpeakApiKey !== undefined ? body.commpeakApiKey : serverMemorySettings.commpeakApiKey).trim(),
      iraqSmsApiUrl: body.iraqSmsApiUrl || serverMemorySettings.iraqSmsApiUrl || DEFAULT_SETTINGS.iraqSmsApiUrl,
      commpeakApiUrl: body.commpeakApiUrl || serverMemorySettings.commpeakApiUrl || DEFAULT_SETTINGS.commpeakApiUrl,
    };

    serverMemorySettings = cleanSettings;

    // Persist to Supabase
    try {
      const supabase = await createClient();
      await supabase
        .from('app_settings')
        .upsert({
          id: 'general',
          settings: cleanSettings,
          updated_at: new Date().toISOString(),
        });
    } catch (dbErr) {
      console.warn('Could not persist settings to Supabase table:', dbErr);
    }

    return NextResponse.json({ success: true, settings: cleanSettings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
