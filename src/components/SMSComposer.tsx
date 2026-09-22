'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSMS } from '@/context/SMSContext';
import { analyzeSMSContent } from '@/utils/smsAnalyzer';
import { fetchTemplatesFromSupabase, FALLBACK_TEMPLATES } from '@/services/templateService';
import { SMSTemplate, TargetingMode } from '@/types';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';
import { 
  X, 
  Send, 
  Smartphone, 
  Users, 
  AlertCircle, 
  FileText, 
  Loader2,
  Building2,
  Layers,
  CheckCircle2,
  Filter,
  Check,
  Globe,
  AlertTriangle
} from 'lucide-react';

export const SMSComposer: React.FC = () => {
  const {
    isComposerOpen,
    setIsComposerOpen,
    composerMessage,
    setComposerMessage,
    resolvedRecipients,
    targetSummaryText,
    targetingMode,
    setTargetingMode,
    targetDepartments,
    toggleTargetDepartment,
    targetStage,
    setTargetStage,
    targetCombinedDept,
    setTargetCombinedDept,
    targetCombinedStage,
    setTargetCombinedStage,
    departments,
    stages,
    selectedStudentIds,
    triggerSendSMS,
    isSending,
    sendProgress,
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

  // Dynamic character, Unicode detection, and SMS cost analysis
  const smsAnalysis = useMemo(() => {
    return analyzeSMSContent(composerMessage);
  }, [composerMessage]);

  const { charCount, segments, isUnicode, remainingInSegment } = smsAnalysis;
  const totalCampaignSegments = segments * resolvedRecipients.length;

  // Phone normalization audit for targeted recipients
  const phoneStats = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    resolvedRecipients.forEach((s) => {
      const norm = normalizeIraqPhoneNumber(s.phoneNumber);
      if (norm.isValid) validCount++;
      else invalidCount++;
    });
    return { validCount, invalidCount };
  }, [resolvedRecipients]);

  // First recipient preview
  const previewStudent = resolvedRecipients[0];
  const renderedPreview = useMemo(() => {
    if (!previewStudent) return composerMessage;
    return composerMessage
      .replace(/{Name}/gi, previewStudent.fullName || 'Student')
      .replace(/{FullName}/gi, previewStudent.fullName || 'Student')
      .replace(/{StudentID}/gi, previewStudent.studentId || 'U2024-XXXX')
      .replace(/{Department}/gi, previewStudent.department || 'Department')
      .replace(/{Stage}/gi, previewStudent.stage || 'Stage')
      .replace(/{Phone}/gi, normalizeIraqPhoneNumber(previewStudent.phoneNumber).normalized || previewStudent.phoneNumber)
      .replace(/{PhoneNumber}/gi, normalizeIraqPhoneNumber(previewStudent.phoneNumber).normalized || previewStudent.phoneNumber);
  }, [composerMessage, previewStudent]);

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
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity animate-backdrop-in"
      />

      {/* Slide-out Sheet Panel */}
      <aside className="relative w-full max-w-xl apple-glass-panel h-full flex flex-col z-10 shadow-2xl animate-drawer-in">
        {/* Sheet Header */}
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-white/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
                Targeted SMS Broadcast
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                Bulk SMS Iraq (9647)
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Automated recipient targeting & Iraq phone normalization
            </p>
          </div>

          <button
            onClick={() => !isSending && setIsComposerOpen(false)}
            disabled={isSending}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-[0.90] cursor-pointer"
            aria-label="Close composer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Composer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Targeting Mode Selector Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Target Audience Strategy:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-black/[0.04]">
              {[
                { id: 'department', label: 'Department' },
                { id: 'stage', label: 'Stage' },
                { id: 'combined', label: 'Combined' },
                { id: 'selected', label: `Selected (${selectedStudentIds.length})` },
              ].map(({ id, label }) => {
                const isActive = targetingMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTargetingMode(id as TargetingMode)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-xl transition-all duration-150 ease-in-out active:scale-[0.97] cursor-pointer text-center ${
                      isActive
                        ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-targeting controls based on active targetingMode */}
          <div className="apple-glass-card rounded-2xl p-3.5 border-zinc-200/80 bg-white/70 space-y-3">
            {/* Mode 1: Department Multi-select */}
            {targetingMode === 'department' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Select Department(s):</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {targetDepartments.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map((dept) => {
                    const isDeptSelected = targetDepartments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleTargetDepartment(dept)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                          isDeptSelected
                            ? 'bg-[#0071e3] text-white border-transparent shadow-xs'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {isDeptSelected && <Check className="w-3 h-3" />}
                        <span>{dept}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Stage Selector */}
            {targetingMode === 'stage' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Select Stage (Across All Departments):</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map((stg) => {
                    const isStgSelected = targetStage === stg;
                    return (
                      <button
                        key={stg}
                        type="button"
                        onClick={() => setTargetStage(stg)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isStgSelected
                            ? 'bg-[#0071e3] text-white border-transparent shadow-xs'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {isStgSelected && <Check className="w-3 h-3" />}
                        <span>{stg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 3: Combined Department + Stage */}
            {targetingMode === 'combined' && (
              <div className="space-y-2">
                <span className="font-semibold text-zinc-700 text-xs flex items-center gap-1.5">
                  <span>Target Specific Stage Within Department:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={targetCombinedDept}
                    onChange={(e) => setTargetCombinedDept(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  <select
                    value={targetCombinedStage}
                    onChange={(e) => setTargetCombinedStage(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {stages.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Mode 4: Selected Rows */}
            {targetingMode === 'selected' && (
              <div className="text-xs text-zinc-600 flex items-center justify-between">
                <span>Currently sending to rows checked manually in the table.</span>
                <span className="font-semibold text-zinc-900">{selectedStudentIds.length} checked</span>
              </div>
            )}

            {/* Dynamic Counter & Clean Summary Card */}
            <div className="pt-2 border-t border-black/[0.04] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>{targetSummaryText}</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-[#0071e3] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                  {resolvedRecipients.length} Recipient{resolvedRecipients.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Iraq Phone Normalization Feedback Banner */}
              <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>All numbers normalized to Iraq standard: <code className="font-mono font-bold">9647XXXXXXXXX</code></span>
                </div>
                {phoneStats.invalidCount > 0 && (
                  <span className="text-rose-600 font-semibold">
                    ({phoneStats.invalidCount} invalid)
                  </span>
                )}
              </div>

              {resolvedRecipients.length === 0 && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>No students found matching your selected targeting criteria.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Message Templates */}
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
              <option value="">Choose a pre-configured university template...</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title} — {tmpl.description}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Attribute Insertion Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Insert Student Variable:</span>
              <span className="text-[11px] text-zinc-400">Click to insert at cursor</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: '{Name}', label: 'Full Name' },
                { tag: '{StudentID}', label: 'University Student ID' },
                { tag: '{Department}', label: 'Department' },
                { tag: '{Stage}', label: 'Academic Stage' },
                { tag: '{PhoneNumber}', label: 'Normalized Phone' },
              ].map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  title={`Insert ${label}`}
                  onClick={() => insertTag(tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-[#0071e3] hover:border-blue-200 text-zinc-700 border border-zinc-200/80 transition-all duration-150 ease-in-out hover:shadow-xs active:scale-[0.95] cursor-pointer"
                >
                  <span className="text-[#0071e3] font-bold">+</span>
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea & Dynamic Cost Calculator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sms-textarea" className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <span>Message Content</span>
                {isUnicode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    <Globe className="w-3 h-3" />
                    <span>Unicode (UCS-2)</span>
                  </span>
                )}
              </label>
              <span className="text-[11px] font-mono text-zinc-500">
                {charCount} chars {isUnicode ? '• 70 chars/seg' : '• 160 chars/seg'}
              </span>
            </div>

            <div className="relative">
              <textarea
                id="sms-textarea"
                ref={textareaRef}
                rows={5}
                value={composerMessage}
                onChange={(e) => setComposerMessage(e.target.value)}
                placeholder="Type your message here... Use {Name} and {StudentID} to personalize."
                className="w-full p-3.5 text-xs sm:text-sm bg-white rounded-2xl border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none shadow-xs leading-relaxed"
              />
            </div>

            {/* Smart Character & Cost Calculator */}
            <div
              className={`p-3 rounded-2xl border transition-all duration-300 space-y-2 ${
                smsAnalysis.statusColor === 'danger'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900 shadow-xs'
                  : smsAnalysis.statusColor === 'warning'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900 shadow-xs'
                  : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-700'
              }`}
            >
              {/* Primary Live Counter Line with dynamic color transitions */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      smsAnalysis.statusColor === 'danger'
                        ? 'bg-rose-500 animate-pulse'
                        : smsAnalysis.statusColor === 'warning'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span
                    id="sms-cost-counter"
                    className={`text-xs font-semibold tracking-tight transition-colors ${
                      smsAnalysis.statusColor === 'danger'
                        ? 'text-rose-700 font-bold'
                        : smsAnalysis.statusColor === 'warning'
                        ? 'text-amber-700 font-bold'
                        : 'text-zinc-600 font-medium'
                    }`}
                  >
                    {smsAnalysis.displayText}
                  </span>
                </div>

                {/* Encoding & Standard Badge */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isUnicode
                      ? 'bg-purple-100/70 text-purple-800 border-purple-200'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>{isUnicode ? 'Unicode (70 limit)' : 'GSM-7 (160 limit)'}</span>
                </div>
              </div>

              {/* Secondary Breakdown Details */}
              <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-1">
                <span
                  className={
                    smsAnalysis.statusColor === 'danger'
                      ? 'text-rose-700 font-medium'
                      : smsAnalysis.statusColor === 'warning'
                      ? 'text-amber-700 font-medium'
                      : 'text-zinc-500'
                  }
                >
                  {remainingInSegment} char{remainingInSegment !== 1 ? 's' : ''} left in current segment
                </span>

                <span className="font-mono text-zinc-700">
                  Total Campaign: <strong className="text-zinc-900 font-bold">{totalCampaignSegments}</strong> credit{totalCampaignSegments !== 1 ? 's' : ''} ({resolvedRecipients.length} recipients)
                </span>
              </div>

              {/* Warning Notice: Within 10 characters of segment boundary */}
              {smsAnalysis.statusColor === 'warning' && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-xl border border-amber-200/80">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Approaching Segment Limit:</strong> Only {remainingInSegment} char{remainingInSegment !== 1 ? 's' : ''} remaining before this message overflows into a 2nd segment, doubling the transmission cost per student.
                  </span>
                </div>
              )}

              {/* Danger Notice: Multi-segment message doubling/multiplying cost */}
              {smsAnalysis.statusColor === 'danger' && (
                <div className="flex items-start gap-1.5 text-[11px] text-rose-800 bg-rose-100/70 p-2 rounded-xl border border-rose-200/80">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Multi-Segment Broadcast ({segments} Segments):</strong> This message exceeds 1 SMS segment and costs {smsAnalysis.costMultiplier}x credits per recipient ({totalCampaignSegments} total credits).
                  </span>
                </div>
              )}

              {/* Unicode Detection Note */}
              {isUnicode && (
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 pt-0.5">
                  <span className="font-semibold text-purple-700">Unicode detected:</span>
                  <span>Non-GSM characters (e.g. Kurdish / Arabic / Emojis) detected. Telecom segment length reduced to 70 characters.</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Mobile Device Preview */}
          <div className="space-y-2 pt-2 border-t border-black/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                <span>Live Student Mobile Preview</span>
              </span>
              {previewStudent && (
                <span className="text-[11px] text-zinc-400">
                  Sample: <strong className="text-zinc-700">{previewStudent.fullName}</strong> ({previewStudent.studentId})
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
                <span className="text-[9px] text-zinc-400 mr-1">
                  Recipient format: {previewStudent ? normalizeIraqPhoneNumber(previewStudent.phoneNumber).normalized : '9647XXXXXXXXX'}
                </span>
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
                  <span>Transmitting Bulk SMS Iraq broadcast...</span>
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
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 ease-in-out cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={triggerSendSMS}
              disabled={isSending || resolvedRecipients.length === 0 || !composerMessage.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] active:scale-[0.98] hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none text-white text-xs sm:text-sm font-semibold transition-all duration-200 ease-in-out shadow-[0_4px_14px_rgba(0,113,227,0.35)] cursor-pointer"
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
                    Broadcast to {resolvedRecipients.length} Student{resolvedRecipients.length !== 1 ? 's' : ''}
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
