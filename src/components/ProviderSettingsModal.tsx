'use client';

import React, { useState } from 'react';
import { 
  X, 
  Code2, 
  Database, 
  Copy, 
  Check, 
  FileCode, 
  ShieldCheck,
  Server
} from 'lucide-react';

export const ProviderSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'sms'>('supabase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleEnv = `# ==============================================
# Supabase Cloud Database Configuration
# ==============================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_cEj9W2JskGN2cAyNfTy3IA_jdyBOl0a"

# ==============================================
# SMS Provider REST Credentials (When ready)
# ==============================================
NEXT_PUBLIC_SMS_API_KEY="your_live_api_key_here"
NEXT_PUBLIC_SMS_API_ENDPOINT="https://api.your-provider.com/v1/messages"
NEXT_PUBLIC_SMS_SENDER_ID="AIRSMS"`;

  const sqlSnippet = `-- Create contacts table with UUID and timestamps
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  stage TEXT NOT NULL DEFAULT 'Stage 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and permissive development policies
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to contacts"
  ON public.contacts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert access to contacts"
  ON public.contacts FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public delete access to contacts"
  ON public.contacts FOR DELETE TO anon, authenticated USING (true);`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl apple-glass-card rounded-3xl p-6 sm:p-8 bg-white/95 z-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                Integration & Database Configuration
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage Supabase PostgreSQL persistence and third-party SMS providers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'supabase'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Database</span>
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'sms'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>SMS Provider API</span>
          </button>
        </div>

        {/* Supabase Tab */}
        {activeTab === 'supabase' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-950">
                  Supabase Integration Ready (@supabase/ssr)
                </div>
                <p className="text-emerald-800/80 mt-0.5 leading-relaxed">
                  The client and server libraries are configured in{' '}
                  <code className="font-mono text-emerald-900 bg-emerald-100/60 px-1 py-0.2 rounded">
                    src/lib/supabase/
                  </code>
                  . Batch upload and table queries read and write directly to your database.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700">SQL Schema (supabase/schema.sql)</span>
                <span className="text-zinc-400 text-[11px]">Run in Supabase SQL Editor</span>
              </div>
              <div className="relative group">
                <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto leading-relaxed max-h-48">
                  {sqlSnippet}
                </pre>
                <button
                  onClick={() => handleCopy(sqlSnippet, 'sql')}
                  className="absolute right-2.5 top-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sql' ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700">Environment Variables (.env.local)</span>
                <span className="text-zinc-400 text-[11px]">Drop your Project URL</span>
              </div>
              <div className="relative group">
                <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto leading-relaxed">
                  {sampleEnv}
                </pre>
                <button
                  onClick={() => handleCopy(sampleEnv, 'env')}
                  className="absolute right-2.5 top-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'env' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS Provider Tab */}
        {activeTab === 'sms' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs space-y-2">
              <div className="flex items-center gap-2 font-mono text-zinc-800 font-semibold">
                <FileCode className="w-4 h-4 text-[#0071e3]" />
                <span>src/services/smsService.ts</span>
              </div>
              <p className="text-zinc-600 leading-relaxed">
                The mock engine currently simulates a 2-second transmission latency. When you finalize your
                contract with your provider (Twilio, Infobip, MessageBird, or Vonage), uncomment the production{' '}
                <code className="bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-900">fetch()</code> block in{' '}
                <code className="font-mono text-zinc-800">smsService.ts</code>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-black/[0.04]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
