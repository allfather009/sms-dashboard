'use client';

import React from 'react';
import { useSMS } from '@/context/SMSContext';
import { Users, CheckSquare, Building2, Send, Zap } from 'lucide-react';

export const DashboardStats: React.FC = () => {
  const { contacts, selectedContacts, selectedCount, departments, stages, setIsComposerOpen } = useSMS();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-7xl mx-auto">
      {/* Total Contacts Card */}
      <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            Total Contacts
          </span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-0.5">
            {contacts.length}
          </div>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
            <Users className="w-3 h-3 text-zinc-400" />
            <span>In active directory</span>
          </span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Selected Recipients Card */}
      <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            Selected for SMS
          </span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#0071e3] mt-0.5">
            {selectedCount ?? selectedContacts.length}
          </div>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
            <CheckSquare className="w-3 h-3 text-[#0071e3]" />
            <span>Targeted recipients</span>
          </span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
          <CheckSquare className="w-5 h-5" />
        </div>
      </div>

      {/* Departments Count Card */}
      <div className="apple-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            Departments
          </span>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-0.5">
            {departments.length}
          </div>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
            <Building2 className="w-3 h-3 text-zinc-400" />
            <span>{stages.length} active stages</span>
          </span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
      </div>

      {/* Quick Launch Card */}
      <div 
        onClick={() => setIsComposerOpen(true)}
        className="apple-glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-blue-300/80 hover:bg-blue-50/30 transition-all group"
      >
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#0071e3]">
            Quick Dispatch
          </span>
          <div className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 mt-0.5 group-hover:text-[#0071e3] transition-colors flex items-center gap-1">
            <span>Send Broadcast</span>
          </div>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-[#0071e3]" />
            <span>Direct Gateway Dispatch</span>
          </span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_2px_10px_rgba(0,113,227,0.3)]">
          <Send className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
