'use client';

import React, { useState, useEffect } from 'react';
import { useSMS } from '@/context/SMSContext';
import { DeliveryGateway } from '@/types';
import { 
  X, 
  Code2, 
  Database, 
  Copy, 
  Check, 
  SlidersHorizontal,
  Radio,
  BookOpen,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Server,
  Sparkles,
  Info,
  Smartphone
} from 'lucide-react';

export const ProviderSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, showToast } = useSMS();

  // Tab State: General | SMS Gateways | Developer Docs
  const [activeTab, setActiveTab] = useState<'general' | 'gateways' | 'docs'>('general');

  // Form State
  const [defaultSenderId, setDefaultSenderId] = useState<string>(settings.defaultSenderId || 'TIUSuli');
  const [defaultGateway, setDefaultGateway] = useState<DeliveryGateway>(settings.defaultGateway || 'iraq_sms');
  const [iraqSmsApiKey, setIraqSmsApiKey] = useState<string>(settings.iraqSmsApiKey || '');
  const [commpeakApiKey, setCommpeakApiKey] = useState<string>(settings.commpeakApiKey || '');

  // Visibility toggles for secure password inputs
  const [showIraqKey, setShowIraqKey] = useState<boolean>(false);
  const [showCommpeakKey, setShowCommpeakKey] = useState<boolean>(false);

  // Status & copy feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync state when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setDefaultSenderId(settings.defaultSenderId || 'TIUSuli');
      setDefaultGateway(settings.defaultGateway || 'iraq_sms');
      setIraqSmsApiKey(settings.iraqSmsApiKey || '');
      setCommpeakApiKey(settings.commpeakApiKey || '');
      setIsSaving(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      // Enforce strict 11-character limit on Sender ID
      const sanitizedSenderId = (defaultSenderId || 'TIUSuli').trim().slice(0, 11);

      await updateSettings({
        defaultSenderId: sanitizedSenderId,
        defaultGateway,
        iraqSmsApiKey: iraqSmsApiKey.trim(),
        commpeakApiKey: commpeakApiKey.trim(),
      });

      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: `Active Gateway: ${defaultGateway === 'commpeak' ? 'Secondary (CommPeak)' : 'Primary (Iraq SMS)'} • Sender ID: ${sanitizedSenderId}`,
        duration: 4000,
      });

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 400);
    } catch (err: unknown) {
      setIsSaving(false);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Could not save configuration.',
        duration: 5000,
      });
    }
  };

  const sampleEnv = `# ==============================================================================
# Supabase Configuration
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# ==============================================================================
# Primary SMS Provider (Bulk SMS Iraq / Standing Tech v4)
# ==============================================================================
IRAQSMS_API_KEY="your-iraq-sms-api-key"
IRAQSMS_API_URL="https://gateway.standingtech.com/api/v4/sms/send"
IRAQSMS_SENDER_ID="TIUSuli"

# ==============================================================================
# Secondary SMS Provider (CommPeak SMS Gateway - simple_send)
# ==============================================================================
COMMPEAK_API_KEY="your-commpeak-api-key"
NEXT_PUBLIC_COMMPEAK_API_KEY="your-commpeak-api-key"
COMMPEAK_API_URL="https://gw.commpeak.com/textpeak/streams/simple_send"
COMMPEAK_SENDER_ID="TIUSuli"`;

  const sqlSnippet = `-- 1. Students Table with Stage Check Constraint
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5')),
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Campaign History with Multi-Provider Gateway Audit
CREATE TABLE IF NOT EXISTS public.campaign_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'partially_delivered', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  total_segments INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  message_preview TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  gateway_used TEXT DEFAULT 'Primary (Iraq SMS)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. App Settings Configuration Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and permissive policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access" ON public.students FOR ALL USING (true);
CREATE POLICY "Allow public all access" ON public.campaign_history FOR ALL USING (true);
CREATE POLICY "Allow public all access" ON public.app_settings FOR ALL USING (true);`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-backdrop-in"
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden flex flex-col z-10 animate-modal-in max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center border border-blue-200/50 flex-shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900">
                System & Gateway Settings
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage SMS delivery gateways, default Sender ID, and developer schema.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all duration-150 ease-in-out active:scale-[0.90] cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Tabbed Navigation: General | SMS Gateways | Developer Docs */}
        <div className="px-6 pt-4 pb-2 border-b border-black/[0.04] bg-white">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-black/[0.04]">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/40'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>General</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gateways')}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'gateways'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/40'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-violet-600" />
              <span>SMS Gateways</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Developer Docs</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">General SMS Parameters</h3>
                <p className="text-xs text-zinc-500">
                  Configure default header identification and telecommunication network properties.
                </p>
              </div>

              {/* Default Sender ID Card */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="default-sender-id" className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#0071e3]" />
                    <span>Default Sender ID (Alphanumeric Originator)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                      defaultSenderId.length >= 11
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-zinc-200/70 text-zinc-700'
                    }`}
                  >
                    {defaultSenderId.length} / 11 chars
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="default-sender-id"
                    type="text"
                    maxLength={11}
                    value={defaultSenderId}
                    onChange={(e) => setDefaultSenderId(e.target.value.slice(0, 11))}
                    placeholder="e.g. TIUSuli"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-zinc-200 text-sm font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0071e3] transition-all"
                  />
                </div>

                {/* Protocol limit callout */}
                <div className="flex items-start gap-2 text-xs text-zinc-500 bg-white p-3 rounded-xl border border-black/[0.04]">
                  <Info className="w-4 h-4 text-[#0071e3] flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-zinc-700">Strict 11-Character Limit:</strong> Global GSM and Iraqi telecom regulations enforce an 11-character maximum for alphanumeric Sender IDs. Spaces and special punctuation are automatically truncated by mobile carriers.
                  </p>
                </div>

                {/* Sender ID Preview on Mobile Display */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Recipient Device Preview
                  </span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-mono">
                    <span className="text-zinc-400">FROM:</span>
                    <span className="text-emerald-400 font-bold tracking-wide">
                      {defaultSenderId || 'TIUSuli'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carrier Throttling Notice */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>5-Second Carrier Anti-Spam Protection</span>
                </div>
                <p className="text-blue-800/80 leading-relaxed text-[11px]">
                  All bulk transmissions through this dashboard include automated 5-second carrier pacing to protect your account reputation and avoid operator filtering (Zain, AsiaCell, Korek).
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SMS GATEWAYS */}
          {activeTab === 'gateways' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">SMS Gateway Routing & API Keys</h3>
                <p className="text-xs text-zinc-500">
                  Configure primary local routing and secondary international fallback gateways.
                </p>
              </div>

              {/* Default Active Provider Selector */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-3">
                <label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-violet-600" />
                    <span>Default Active Gateway</span>
                  </span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    Preselected in SMS Composer
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Primary Iraq SMS */}
                  <div
                    onClick={() => setDefaultGateway('iraq_sms')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      defaultGateway === 'iraq_sms'
                        ? 'bg-blue-50/80 border-[#0071e3] ring-1 ring-[#0071e3]/30 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        defaultGateway === 'iraq_sms'
                          ? 'border-[#0071e3] bg-[#0071e3]'
                          : 'border-zinc-300'
                      }`}
                    >
                      {defaultGateway === 'iraq_sms' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Primary (Iraq SMS)</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                        Standing Tech v4 • Direct local telecom routes (Asiacell, Zain, Korek).
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Secondary CommPeak */}
                  <div
                    onClick={() => setDefaultGateway('commpeak')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      defaultGateway === 'commpeak'
                        ? 'bg-violet-50/80 border-violet-600 ring-1 ring-violet-600/30 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        defaultGateway === 'commpeak'
                          ? 'border-violet-600 bg-violet-600'
                          : 'border-zinc-300'
                      }`}
                    >
                      {defaultGateway === 'commpeak' && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Secondary (CommPeak)</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                        CommPeak REST API • Global multi-carrier failover routing.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary API Key (Iraq SMS) Field */}
              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
                    <label htmlFor="iraqsms-key" className="text-xs font-bold text-zinc-900">
                      Primary API Key (Standing Tech / Iraq SMS)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                    IRAQSMS_API_KEY
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="iraqsms-key"
                    type={showIraqKey ? 'text' : 'password'}
                    value={iraqSmsApiKey}
                    onChange={(e) => setIraqSmsApiKey(e.target.value)}
                    placeholder="Enter Iraq SMS API token (or leave empty to use .env)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0071e3] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowIraqKey(!showIraqKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    title={showIraqKey ? 'Hide key' : 'Show key'}
                  >
                    {showIraqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Endpoint: gateway.standingtech.com/api/v4/sms/send</span>
                  {iraqSmsApiKey && <span className="text-emerald-600 font-sans font-semibold">Configured</span>}
                </div>
              </div>

              {/* Secondary API Key (CommPeak) Field */}
              <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-600" />
                    <label htmlFor="commpeak-key" className="text-xs font-bold text-zinc-900">
                      Secondary API Key (CommPeak SMS)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                    COMMPEAK_API_KEY
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="commpeak-key"
                    type={showCommpeakKey ? 'text' : 'password'}
                    value={commpeakApiKey}
                    onChange={(e) => setCommpeakApiKey(e.target.value)}
                    placeholder="Enter CommPeak API token (or leave empty to use .env)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCommpeakKey(!showCommpeakKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    title={showCommpeakKey ? 'Hide key' : 'Show key'}
                  >
                    {showCommpeakKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Endpoint: gw.commpeak.com/textpeak/streams/simple_send</span>
                  {commpeakApiKey && <span className="text-violet-600 font-sans font-semibold">Configured</span>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">Developer Documentation & Schemas</h3>
                <p className="text-xs text-zinc-500">
                  Static SQL schemas and environment variables reference for database administrators.
                </p>
              </div>

              {/* Supabase Status Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-emerald-950">
                    Live Supabase Multi-Provider Integration
                  </div>
                  <p className="text-emerald-800/80 mt-0.5 leading-relaxed">
                    The application connects directly to Supabase PostgreSQL using server actions and SSR clients in{' '}
                    <code className="font-mono text-emerald-900 bg-emerald-100/60 px-1 py-0.5 rounded">
                      src/lib/supabase/
                    </code>
                    . Broadcast batches automatically log the exact billing provider in{' '}
                    <code className="font-mono text-emerald-900 bg-emerald-100/60 px-1 py-0.5 rounded">
                      campaign_history.gateway_used
                    </code>
                    .
                  </p>
                </div>
              </div>

              {/* SQL Schema Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Database Schema (supabase/schema.sql)</span>
                  </span>
                  <span className="text-zinc-400 text-[11px]">PostgreSQL 15+</span>
                </div>
                <div className="relative group">
                  <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto leading-relaxed max-h-56">
                    {sqlSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(sqlSnippet, 'sql')}
                    className="absolute right-2.5 top-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedKey === 'sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'sql' ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
              </div>

              {/* Environment Variables Reference Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Environment Variables (.env.local)</span>
                  </span>
                  <span className="text-zinc-400 text-[11px]">Server-side secrets</span>
                </div>
                <div className="relative group">
                  <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto leading-relaxed max-h-56">
                    {sampleEnv}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(sampleEnv, 'env')}
                    className="absolute right-2.5 top-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedKey === 'env' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer with Primary "Save Settings" Button */}
        <div className="px-6 py-4 border-t border-black/[0.06] bg-zinc-50/70 flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-400 hidden sm:block">
            {activeTab === 'general' && 'Sender ID strictly capped at 11 characters.'}
            {activeTab === 'gateways' && 'Credentials apply immediately to Composer & Send API.'}
            {activeTab === 'docs' && 'Reference documents are read-only.'}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
