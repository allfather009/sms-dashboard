'use client';

import React from 'react';
import { useSMS } from '@/context/SMSContext';
import { 
  MessageSquare, 
  UploadCloud, 
  Users, 
  History, 
  Code2, 
  Send, 
  Sparkles
} from 'lucide-react';

export const Navbar: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { 
    activeTab, 
    setActiveTab, 
    contacts, 
    selectedContacts, 
    setIsComposerOpen,
    loadSampleData,
    isSupabaseLive
  } = useSMS();

  return (
    <header className="relative w-full border-b border-black/[0.06] bg-white/75 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0071e3] to-[#42a5f5] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,113,227,0.35)]">
              <MessageSquare className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-900 tracking-tight text-base">
                  TIUS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#0071e3] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  SMS Dashboard
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isSupabaseLive ? 'Supabase Connected' : 'Local Directory'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* macOS-style Segmented Control */}
        <nav className="hidden md:flex items-center bg-zinc-200/60 p-1 rounded-xl border border-black/[0.04]">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'students' || (activeTab as string) === 'contacts'
                ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Students</span>
            <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-zinc-100 text-zinc-600 font-mono">
              {contacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Data</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'campaigns'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Campaign Log</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick sample load button if contacts are low */}
          {contacts.length === 0 && (
            <button
              onClick={loadSampleData}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Data</span>
            </button>
          )}

          {/* Provider API modal trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 bg-white/80 text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
            title="View API integration docs & configuration"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Primary Compose SMS Button */}
          <button
            onClick={() => setIsComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] active:bg-[#0062c4] active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(0,113,227,0.3)]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose SMS</span>
            {selectedContacts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 font-mono font-bold">
                {selectedContacts.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
