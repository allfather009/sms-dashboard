'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSMS } from '@/context/SMSContext';
import { calculateSMSSegments, renderPersonalizedMessage } from '@/services/smsService';
import { fetchTemplatesFromSupabase, FALLBACK_TEMPLATES } from '@/services/templateService';
import { SMSTemplate } from '@/types';
import { 
  X, 
  Send, 
  Smartphone, 
  Users, 
  AlertCircle, 
  FileText, 
  Loader2
} from 'lucide-react';

export const SMSComposer: React.FC = () => {
  const {
    isComposerOpen,
    setIsComposerOpen,
    composerMessage,
    setComposerMessage,
    selectedContacts,
    triggerSendSMS,
    isSending,
    sendProgress,
    filters,
  } = useSMS();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<SMSTemplate[]>(FALLBACK_TEMPLATES);

  useEffect(() => {
    fetchTemplatesFromSupabase().then((res) => {
      if (res.data && res.data.length > 0) {
        setTemplates(res.data);
      }
    });
  }, []);

  // Character and segment calculations
  const { charCount, segments, isUnicode, remainingInSegment } = useMemo(() => {
    return calculateSMSSegments(composerMessage);
  }, [composerMessage]);

  const totalCampaignSegments = segments * selectedContacts.length;

  // Personalized preview for the first selected contact
  const previewContact = selectedContacts[0];
  const renderedPreview = useMemo(() => {
    if (!previewContact) return composerMessage;
    return renderPersonalizedMessage(composerMessage, previewContact);
  }, [composerMessage, previewContact]);

  // Insert variable tag into textarea at cursor
  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setComposerMessage(composerMessage + tag);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = composerMessage;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setComposerMessage(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Apply a template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setComposerMessage(tmpl.content);
    }
  };

  if (!isComposerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => !isSending && setIsComposerOpen(false)}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-out Sheet Panel */}
      <aside className="relative w-full max-w-lg apple-glass-panel h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Sheet Header */}
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-white/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                SMS Composer
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0071e3] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                GSM / UCS-2
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Targeting {selectedContacts.length} recipient{selectedContacts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={() => !isSending && setIsComposerOpen(false)}
            disabled={isSending}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            aria-label="Close composer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Composer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Recipient Summary Card */}
          <div className="apple-glass-card rounded-2xl p-4 space-y-2 border-blue-100 bg-blue-50/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Audience Summary</span>
              </span>
              <span className="text-[11px] font-mono font-medium text-[#0071e3] bg-blue-100/70 px-2 py-0.5 rounded-full">
                {selectedContacts.length} contacts
              </span>
            </div>

            <p className="text-xs text-zinc-600">
              Sending to <span className="font-semibold text-zinc-900">{selectedContacts.length} contacts</span>
              {filters.department !== 'All' ? ` in ${filters.department}` : ' across All Departments'}
              {filters.stage !== 'All' ? ` (${filters.stage})` : ''}.
            </p>

            {/* Recipient Pill Preview */}
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedContacts.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-zinc-700 border border-black/[0.04] shadow-xs"
                >
                  {c.name}
                </span>
              ))}
              {selectedContacts.length > 5 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/80 text-zinc-600">
                  +{selectedContacts.length - 5} more
                </span>
              )}
            </div>

            {selectedContacts.length === 0 && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs mt-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>No contacts currently selected. Please select recipients from the table.</span>
              </div>
            )}
          </div>

          {/* Quick Preset Templates */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Message Templates</span>
              </span>
              {selectedTemplateId && (
                <button
                  onClick={() => {
                    setSelectedTemplateId('');
                    setComposerMessage('');
                  }}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer shadow-xs"
            >
              <option value="">Choose a pre-configured template...</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title} — {tmpl.description}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Placeholder Insertion Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Insert Contact Attribute:</span>
              <span className="text-[11px] text-zinc-400">Click to insert</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: '{Name}', label: 'Recipient Name' },
                { tag: '{Department}', label: 'Department' },
                { tag: '{Stage}', label: 'Stage' },
                { tag: '{PhoneNumber}', label: 'Phone' },
              ].map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  title={`Insert ${label}`}
                  aria-label={`Insert ${label}`}
                  onClick={() => insertTag(tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-[#0071e3] hover:border-blue-200 text-zinc-700 border border-zinc-200/80 transition-all active:scale-[0.97]"
                >
                  <span className="text-[#0071e3] font-bold">+</span>
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sms-textarea" className="font-semibold text-zinc-800">
                Message Content
              </label>
              <span className="text-[11px] font-mono text-zinc-500">
                {charCount} chars {isUnicode ? '• UCS-2' : '• GSM-7'}
              </span>
            </div>

            <div className="relative">
              <textarea
                id="sms-textarea"
                ref={textareaRef}
                rows={5}
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
                placeholder="Type your message here... Use {Name} to personalize."
                className="w-full p-3.5 text-xs sm:text-sm bg-white rounded-2xl border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none shadow-xs leading-relaxed"
              />
            </div>

            {/* Segment and Character Breakdown Badge */}
            <div className="flex items-center justify-between text-[11px] px-1 text-zinc-500 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    segments === 1 ? 'bg-emerald-500' : segments === 2 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                />
                <span className="font-medium text-zinc-700">
                  {segments} SMS segment{segments !== 1 ? 's' : ''} per contact
                </span>
                <span className="text-zinc-400">
                  ({remainingInSegment} char{remainingInSegment !== 1 ? 's' : ''} left in segment)
                </span>
              </div>

              <div className="font-mono font-semibold text-zinc-900">
                Total: {totalCampaignSegments} segment{totalCampaignSegments !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Live Mobile Device Preview */}
          <div className="space-y-2 pt-2 border-t border-black/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                <span>Live Recipient Preview</span>
              </span>
              {previewContact && (
                <span className="text-[11px] text-zinc-400">
                  Rendering as: <span className="font-medium text-zinc-700">{previewContact.name}</span>
                </span>
              )}
            </div>

            {/* iPhone Message Bubble Preview */}
            <div className="rounded-2xl bg-zinc-100/90 p-4 border border-zinc-200/80">
              <div className="flex items-center justify-center mb-2">
                <span className="text-[10px] font-medium text-zinc-400">
                  Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • SMS
                </span>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-xs px-3.5 py-2.5 bg-[#0071e3] text-white text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap">
                  {renderedPreview || 'Start typing a message above to see preview...'}
                </div>
              </div>

              <div className="flex justify-end mt-1">
                <span className="text-[9px] text-zinc-400 mr-1">Delivered via AirSMS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer with Send Action */}
        <div className="p-5 border-t border-black/[0.06] bg-white/70 space-y-3">
          {/* Real-time transmitting progress bar */}
          {isSending && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3.5 h-3.5 text-[#0071e3] animate-spin" />
                  <span>Simulating carrier API transmission (2s delay)...</span>
                </span>
                <span className="font-mono font-semibold text-[#0071e3]">{sendProgress}%</span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
                <div
                  className="h-full bg-gradient-to-r from-[#0071e3] to-[#42a5f5] transition-all duration-300 rounded-full"
                  style={{ width: `${sendProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Send Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsComposerOpen(false)}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={triggerSendSMS}
              disabled={isSending || selectedContacts.length === 0 || !composerMessage.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition-all shadow-[0_4px_14px_rgba(0,113,227,0.35)]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Broadcasting Messages...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
