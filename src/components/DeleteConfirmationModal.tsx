'use client';

import React, { useState } from 'react';
import { Student } from '@/types';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  student,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !student) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(student.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => !isDeleting && onClose()}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Alert Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Delete Student Record?
                </h3>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                Are you sure you want to delete <strong className="text-zinc-900">{student.fullName}</strong> (Student ID: <code className="font-mono font-semibold text-zinc-800">{student.studentId}</code>)?
              </p>

              <p className="text-[11px] text-rose-600 mt-2 font-medium">
                This action will immediately remove the student from the Supabase database.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Student</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
