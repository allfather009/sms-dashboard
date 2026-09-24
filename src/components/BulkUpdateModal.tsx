'use client';

import React, { useState } from 'react';
import { VALID_STAGES } from '@/utils/fileParser';
import { 
  SlidersHorizontal, 
  Building2, 
  GraduationCap, 
  X, 
  Loader2, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BulkUpdateModalProps {
  isOpen: boolean;
  selectedCount: number;
  departments: string[];
  stages: string[];
  onClose: () => void;
  onConfirm: (updates: { department?: string; stage?: string }) => Promise<{ success: boolean; error?: string }>;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  isOpen,
  selectedCount,
  departments,
  stages,
  onClose,
  onConfirm,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasChanges = Boolean(selectedDepartment || selectedStage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setErrorMsg('Please choose at least one attribute to update (Department or Stage).');
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);
    try {
      const updates: { department?: string; stage?: string } = {};
      if (selectedDepartment) updates.department = selectedDepartment;
      if (selectedStage) updates.stage = selectedStage;

      const result = await onConfirm(updates);
      if (result.success) {
        setSelectedDepartment('');
        setSelectedStage('');
        onClose();
      } else {
        setErrorMsg(result.error || 'Failed to apply bulk update.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during bulk update.');
    } finally {
      setIsSaving(false);
    }
  };

  const availableStages = stages && stages.length > 0 ? stages : [...VALID_STAGES];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div
        onClick={() => !isSaving && onClose()}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-backdrop-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden z-10 animate-modal-in">
        {/* Header */}
        <div className="p-6 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center border border-blue-200/60 shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Bulk Update Cohort
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#0071e3] text-white rounded-full">
                  {selectedCount} Selected
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Batch modify shared attributes across all checked students
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition-all duration-150 ease-in-out active:scale-[0.90] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Informative Callout */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Updates will apply to all <strong className="font-semibold text-blue-950">{selectedCount} selected students</strong> simultaneously. Unique individual attributes (Full Name, Student ID, Phone Number) will remain unchanged.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Department Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Department</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">Optional</span>
            </label>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all cursor-pointer disabled:bg-zinc-100"
            >
              <option value="">-- Leave Department Unchanged --</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Stage Field (Cohort Promotion) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Academic Stage (Cohort Promotion)</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">Optional</span>
            </label>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all cursor-pointer disabled:bg-zinc-100"
            >
              <option value="">-- Leave Stage Unchanged --</option>
              {availableStages.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>

            {/* Quick Cohort Promotion Buttons */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 mr-1">Quick Select:</span>
              {availableStages.map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setSelectedStage(stg)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all duration-150 cursor-pointer ${
                    selectedStage === stg
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-[0.96]'
                  }`}
                >
                  {stg}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Preview */}
          {hasChanges && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs space-y-1 text-zinc-700 animate-in fade-in">
              <div className="font-semibold text-zinc-900 flex items-center gap-1">
                <span>Pending Bulk Changes:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {selectedDepartment && (
                  <li>
                    Set Department to <strong className="text-zinc-900">{selectedDepartment}</strong>
                  </li>
                )}
                {selectedStage && (
                  <li>
                    Promote Stage to <strong className="text-zinc-900">{selectedStage}</strong>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-black/[0.04]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 ease-in-out cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] active:scale-[0.98] hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all duration-200 ease-in-out cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating {selectedCount} Students...</span>
                </>
              ) : (
                <>
                  <span>Apply Bulk Update ({selectedCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
