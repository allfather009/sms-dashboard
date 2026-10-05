'use client';

import React, { useState } from 'react';
import { useSMS } from '@/context/SMSContext';
import {
  History,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  Send,
  Radio
} from 'lucide-react';
import { SMSBatchResult } from '@/types';
import { CampaignRecipientsModal } from './CampaignRecipientsModal';

export const CampaignHistory: React.FC = () => {
  const { campaignHistory, setIsComposerOpen, setActiveTab } = useSMS();
  const [selectedBatchForModal, setSelectedBatchForModal] = useState<SMSBatchResult | null>(null);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Campaign Activity & Audit Log
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Real-time delivery receipts, gateway routing, and billing company audit records.
        </p>
      </div>

      {campaignHistory.length === 0 ? (
        /* Empty State */
        <div className="apple-glass-card rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">
            No Broadcasts Sent Yet
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Select contacts from the table or import an Excel/CSV file to compose your first bulk SMS transmission.
          </p>
          <button
            onClick={() => {
              setActiveTab('contacts');
              setIsComposerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose First Campaign</span>
          </button>
        </div>
      ) : (
        /* List of Past Campaigns */
        <div className="space-y-4">
          {campaignHistory.map((batch, batchIdx) => {
            const batchKey = batch.batchId || `batch-${batchIdx}`;
            const gatewayName = batch.gatewayUsed || batch.gateway_used || 'Primary (Iraq SMS)';
            const isCommPeak = gatewayName.toLowerCase().includes('commpeak');

            return (
              <div
                key={batchKey}
                className="apple-glass-card rounded-2xl p-5 border border-black/[0.06] hover:border-black/[0.1] transition-all space-y-4"
              >
                {/* Batch Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-900 text-sm">
                          Batch {batch.batchId}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% Delivered
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isCommPeak
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-blue-50 text-[#0071e3] border-blue-200'
                          }`}
                          title={`Billed & Dispatched via ${gatewayName}`}
                        >
                          <Radio className="w-2.5 h-2.5" />
                          <span>{gatewayName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(batch.sentAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Latency: {batch.providerDetails.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForModal(batch)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/80 hover:bg-blue-50 hover:text-[#0071e3] text-zinc-700 transition-all cursor-pointer group border border-transparent hover:border-blue-200/60"
                      title="View full recipient audit list"
                    >
                      <Users className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#0071e3]" />
                      <span>
                        <strong className="text-zinc-900 group-hover:text-[#0071e3]">{batch.recipientCount}</strong> recipients
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/80 text-zinc-700">
                      <Layers className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        <strong className="text-zinc-900">{batch.totalSegments}</strong> segments
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content Preview */}
                <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/60 text-xs text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap">
                  {batch.messagePreview}
                </div>

                {/* Recipient sample pills & View All interactive button */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                  <span className="text-[11px] font-semibold text-zinc-600 mr-1">Recipients:</span>
                  {batch.recipients.slice(0, 5).map((r, rIdx) => {
                    const recipientKey = r.id || `${batchKey}-recip-${rIdx}-${r.phoneNumber || ''}`;
                    const displayName = r.name || r.phoneNumber || `Recipient ${rIdx + 1}`;
                    const deptInfo = r.department ? ` (${r.department})` : '';
                    return (
                      <span
                        key={recipientKey}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-zinc-700 border border-black/[0.04]"
                      >
                        {displayName}{deptInfo}
                      </span>
                    );
                  })}
                  {batch.recipients.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForModal(batch)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071e3] hover:text-[#0077ed] hover:underline cursor-pointer transition-colors ml-1"
                    >
                      View all {batch.recipientCount || batch.recipients.length} recipients →
                    </button>
                  ) : batch.recipients.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForModal(batch)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071e3] hover:text-[#0077ed] hover:underline cursor-pointer transition-colors ml-1"
                    >
                      View list ({batch.recipients.length})
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Searchable Campaign Recipients Audit Modal */}
      <CampaignRecipientsModal
        batch={selectedBatchForModal}
        isOpen={!!selectedBatchForModal}
        onClose={() => setSelectedBatchForModal(null)}
      />
    </div>
  );
};
