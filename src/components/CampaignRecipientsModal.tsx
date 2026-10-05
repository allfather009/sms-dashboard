'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Users,
  Phone,
  Building2,
  CheckCircle2,
  Layers,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import { SMSBatchResult } from '@/types';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';

interface CampaignRecipientsModalProps {
  batch: SMSBatchResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignRecipientsModal: React.FC<CampaignRecipientsModalProps> = ({
  batch,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset search when modal opens with a new batch
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, batch?.batchId]);

  // Real-time client-side filtering across name, phone, department, and stage
  const filteredRecipients = useMemo(() => {
    if (!batch?.recipients) return [];
    if (!searchQuery.trim()) return batch.recipients;

    const q = searchQuery.toLowerCase().trim();
    const cleanDigitsQuery = q.replace(/[^0-9]/g, '');

    return batch.recipients.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const dept = (r.department || '').toLowerCase();
      const stage = (r.stage || '').toLowerCase();
      const rawPhone = (r.phoneNumber || '').toLowerCase();
      const cleanDigitsPhone = rawPhone.replace(/[^0-9]/g, '');

      return (
        name.includes(q) ||
        dept.includes(q) ||
        stage.includes(q) ||
        rawPhone.includes(q) ||
        (cleanDigitsQuery.length > 0 && cleanDigitsPhone.includes(cleanDigitsQuery))
      );
    });
  }, [batch?.recipients, searchQuery]);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => {
      setCopiedPhone((prev) => (prev === phone ? null : prev));
    }, 2000);
  };

  if (!isOpen || !batch) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      {/* Frosted Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-backdrop-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden flex flex-col z-10 animate-modal-in max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center border border-blue-200/50 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight truncate">
                  Campaign Recipients
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#0071e3] border border-blue-200/60 flex-shrink-0">
                  Batch {batch.batchId}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border flex-shrink-0 ${
                    (batch.gatewayUsed || batch.gateway_used || '').toLowerCase().includes('commpeak')
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-blue-50 text-[#0071e3] border-blue-200'
                  }`}
                  title={`Gateway: ${batch.gatewayUsed || batch.gateway_used || 'Primary (Iraq SMS)'}`}
                >
                  <Radio className="w-2.5 h-2.5" />
                  <span>{batch.gatewayUsed || batch.gateway_used || 'Primary (Iraq SMS)'}</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                Sent {new Date(batch.sentAt).toLocaleString()} • {batch.recipientCount} Total Recipients
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-all active:scale-[0.90] cursor-pointer flex-shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Search & Filter Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-3 border-b border-zinc-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-100/90 hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-[#0071e3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-zinc-400 text-zinc-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-[11px] font-medium text-zinc-500 whitespace-nowrap bg-zinc-50 border border-zinc-200/60 px-2.5 py-1.5 rounded-lg">
            Showing <strong className="text-zinc-900">{filteredRecipients.length}</strong> of{' '}
            <strong className="text-zinc-900">{batch.recipients.length}</strong>
          </div>
        </div>

        {/* Scrollable Recipient List */}
        <div className="flex-1 max-h-[60vh] overflow-y-auto divide-y divide-zinc-100 px-6 py-1">
          {filteredRecipients.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-800 mb-0.5">
                No recipients match &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-[11px] text-zinc-400 mb-3">
                Try searching for a different name, Iraqi mobile number, or department.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-medium text-[#0071e3] hover:underline cursor-pointer"
              >
                Clear search query
              </button>
            </div>
          ) : (
            filteredRecipients.map((recipient, idx) => {
              const rowKey = recipient.id || `${batch.batchId}-item-${idx}-${recipient.phoneNumber}`;
              const phoneObj = normalizeIraqPhoneNumber(recipient.phoneNumber);
              const formattedPhone = phoneObj.isValid ? phoneObj.formatted : recipient.phoneNumber;
              const isCopied = copiedPhone === recipient.phoneNumber;

              return (
                <div
                  key={rowKey}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/80 -mx-6 px-6 transition-colors group"
                >
                  {/* Left: Student Identity & Department */}
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0071e3] font-semibold text-xs flex items-center justify-center flex-shrink-0 border border-blue-100">
                      {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'S'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 truncate">
                          {recipient.name || 'Unnamed Student'}
                        </span>
                        {recipient.stage && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 flex-shrink-0">
                            <Layers className="w-2.5 h-2.5 text-zinc-400" />
                            {recipient.stage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                        <Building2 className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">
                          {recipient.department || 'General Directory'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Phone Number & Status */}
                  <div className="flex items-center gap-2 self-start sm:self-center ml-11 sm:ml-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(recipient.phoneNumber, e)}
                      title="Click to copy phone number"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100/80 hover:bg-blue-50 hover:text-[#0071e3] border border-zinc-200/60 font-mono text-[11px] text-zinc-700 transition-colors cursor-pointer group-hover:border-zinc-300"
                    >
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span>{formattedPhone}</span>
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                      )}
                    </button>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Delivered
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-black/[0.04] flex items-center justify-between text-xs">
          <div className="text-zinc-500">
            Total Batch Size:{' '}
            <strong className="text-zinc-800 font-semibold">{batch.recipients.length}</strong>{' '}
            recipients
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
