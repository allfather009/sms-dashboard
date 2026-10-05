import { AppSettings, DeliveryGateway } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultSenderId: 'TIUSuli',
  defaultGateway: 'iraq_sms',
  iraqSmsApiKey: '',
  commpeakApiKey: '',
  iraqSmsApiUrl: 'https://gateway.standingtech.com/api/v4/sms/send',
  commpeakApiUrl: 'https://api.commpeak.com/v1/sms/send',
};

const STORAGE_KEY = 'tius_sms_settings_v1';

/**
 * Retrieves settings from localStorage, falling back to DEFAULT_SETTINGS.
 */
export function getLocalSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Ensure Sender ID adheres to strict 11-char alphanumeric limit
      defaultSenderId: (parsed.defaultSenderId || DEFAULT_SETTINGS.defaultSenderId).slice(0, 11),
      defaultGateway: (['iraq_sms', 'commpeak'].includes(parsed.defaultGateway)
        ? parsed.defaultGateway
        : DEFAULT_SETTINGS.defaultGateway) as DeliveryGateway,
    };
  } catch (err) {
    console.error('Failed to parse local settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persists settings to localStorage and syncs with the server/Supabase.
 */
export async function persistSettings(newSettings: AppSettings): Promise<AppSettings> {
  // Normalize settings
  const cleanSettings: AppSettings = {
    ...newSettings,
    defaultSenderId: (newSettings.defaultSenderId || 'TIUSuli').trim().slice(0, 11),
    defaultGateway: newSettings.defaultGateway === 'commpeak' ? 'commpeak' : 'iraq_sms',
    iraqSmsApiKey: (newSettings.iraqSmsApiKey || '').trim(),
    commpeakApiKey: (newSettings.commpeakApiKey || '').trim(),
    iraqSmsApiUrl: newSettings.iraqSmsApiUrl || DEFAULT_SETTINGS.iraqSmsApiUrl,
    commpeakApiUrl: newSettings.commpeakApiUrl || DEFAULT_SETTINGS.commpeakApiUrl,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanSettings));
    } catch (err) {
      console.warn('Failed to save settings to localStorage:', err);
    }
  }

  // Sync to backend / Supabase
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanSettings),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        return data.settings;
      }
    }
  } catch (err) {
    console.warn('Could not sync settings to remote server:', err);
  }

  return cleanSettings;
}

/**
 * Fetches remote settings from server / Supabase and updates local storage.
 */
export async function syncRemoteSettings(): Promise<AppSettings> {
  const local = getLocalSettings();
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        const merged: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...local,
          ...data.settings,
          defaultSenderId: (data.settings.defaultSenderId || local.defaultSenderId || 'TIUSuli').slice(0, 11),
          // Keep locally entered keys if remote only returned environment hints
          iraqSmsApiKey: local.iraqSmsApiKey || data.settings.iraqSmsApiKey || '',
          commpeakApiKey: local.commpeakApiKey || data.settings.commpeakApiKey || '',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch remote settings, using local fallback:', err);
  }
  return local;
}
