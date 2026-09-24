'use client';

import React, { useState } from 'react';
import { SMSProvider, useSMS } from '@/context/SMSContext';
import { Navbar } from '@/components/Navbar';
import { StudentTable } from '@/components/StudentTable';
import { UploadZone } from '@/components/UploadZone';
import { SMSComposer } from '@/components/SMSComposer';
import { DynamicIslandToast } from '@/components/DynamicIslandToast';
import { CampaignHistory } from '@/components/CampaignHistory';
import { ProviderSettingsModal } from '@/components/ProviderSettingsModal';
import { DashboardStats } from '@/components/DashboardStats';
import { UploadCloud } from 'lucide-react';

function DashboardContent() {
  const { activeTab, setActiveTab } = useSMS();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col antialiased text-zinc-900 selection:bg-blue-100 selection:text-blue-900 pb-20">
      {/* Apple Dynamic Island Toast Notification */}
      <DynamicIslandToast />

      {/* Navigation Header */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold tracking-wide text-[#0071e3] bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                Tishk International University — Sulaimani
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              Student Communications & SMS Directory
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
              Official student communication portal for broadcasting SMS announcements across academic stages and departments.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => setActiveTab(activeTab === 'upload' ? 'students' : 'upload')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ease-in-out hover:shadow-xs active:scale-[0.98] cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-700 border border-zinc-200/80 hover:bg-zinc-50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{activeTab === 'upload' ? 'Back to Students' : 'Import Excel / CSV'}</span>
            </button>
          </div>
        </div>

        {/* Dashboard Overview Metrics */}
        <DashboardStats />

        {/* Dynamic View Sections based on activeTab */}
        <div className="transition-all duration-200">
          {(activeTab === 'students' || (activeTab as string) === 'contacts') && <StudentTable />}
          {activeTab === 'upload' && <UploadZone />}
          {activeTab === 'campaigns' && <CampaignHistory />}
        </div>
      </main>

      {/* Slide-out SMS Composer */}
      <SMSComposer />

      {/* Provider API Integration Modal */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Minimal Footer */}
      <footer className="mt-auto py-6 border-t border-black/[0.04] text-center text-xs text-zinc-400">
        <p>TIUS SMS Dashboard • Tishk International University Sulaimani</p>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <SMSProvider>
      <DashboardContent />
    </SMSProvider>
  );
}
