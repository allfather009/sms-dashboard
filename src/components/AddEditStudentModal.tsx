'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '@/types';
import { useSMS } from '@/context/SMSContext';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';
import { 
  X, 
  User, 
  GraduationCap, 
  Phone, 
  Building2, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface AddEditStudentModalProps {
  isOpen: boolean;
  studentToEdit: Student | null;
  onClose: () => void;
  onSave: (studentData: {
    studentId: string;
    fullName: string;
    department: string;
    stage: string;
    phoneNumber: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const STAGE_PRESETS = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Postgraduate'];

export const AddEditStudentModal: React.FC<AddEditStudentModalProps> = ({
  isOpen,
  studentToEdit,
  onClose,
  onSave,
}) => {
  const { departments } = useSMS();
  const isEditMode = Boolean(studentToEdit);

  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(departments[0] || 'Information Technology (IT)');
  const [stage, setStage] = useState('Stage 1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or reset form when studentToEdit changes
  useEffect(() => {
    if (studentToEdit) {
      setStudentId(studentToEdit.studentId);
      setFullName(studentToEdit.fullName);
      setDepartment(studentToEdit.department);
      setStage(studentToEdit.stage);
      setPhoneNumber(studentToEdit.phoneNumber);
    } else {
      setStudentId('');
      setFullName('');
      setDepartment(departments[0] || 'Information Technology (IT)');
      setStage('Stage 1');
      setPhoneNumber('');
    }
    setFormError(null);
  }, [studentToEdit, isOpen, departments]);

  // Real-time Iraqi phone normalization
  const phoneValidation = useMemo(() => {
    return normalizeIraqPhoneNumber(phoneNumber);
  }, [phoneNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!studentId.trim()) {
      setFormError('Student ID number is required (e.g. U2024-1001).');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    if (!phoneValidation.isValid) {
      setFormError('Please enter a valid Iraqi mobile number (e.g. 0750XXXXXXX, 0770XXXXXXX, 0780XXXXXXX).');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSave({
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        department: department.trim(),
        stage: stage.trim(),
        phoneNumber: phoneValidation.normalized,
      });

      if (result.success) {
        onClose();
      } else {
        setFormError(result.error || 'Failed to save student.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div 
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center border border-blue-200/50">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
                {isEditMode ? 'Edit Student Details' : 'Add New Student'}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {isEditMode ? 'Update student record in Supabase database' : 'Register a new student into the university directory'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {formError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Student ID & Full Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                <span>Student ID *</span>
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. U2024-1001"
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ahmed Ali Al-Bayati"
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Department & Stage Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Department *</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Academic Stage *</span>
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
              >
                {STAGE_PRESETS.map((stg) => (
                  <option key={stg} value={stg}>
                    {stg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Iraqi Mobile Phone Number */}
          <div>
            <label className="font-semibold text-zinc-700 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mobile Phone (Iraq) *</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Format: 07XXXXXXXXX
              </span>
            </label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0750 123 4567 or 9647501234567"
              className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono"
            />

            {/* Live Iraq Normalization Feedback Badge */}
            {phoneNumber.trim() && (
              <div className="mt-2 text-[11px] p-2 rounded-xl border transition-all">
                {phoneValidation.isValid ? (
                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/70 border-emerald-200/60 p-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bulk SMS Iraq: <strong className="font-mono">{phoneValidation.normalized}</strong></span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800">
                      {phoneValidation.operator}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/70 border-amber-200/60 p-1.5 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{phoneValidation.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !phoneValidation.isValid || !studentId.trim() || !fullName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] active:bg-[#0062c4] disabled:opacity-50 disabled:pointer-events-none text-xs font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Update Student' : 'Save Student'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
