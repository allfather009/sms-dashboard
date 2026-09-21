'use client';

import React from 'react';
import { useSMS } from '@/context/SMSContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

export const DynamicIslandToast: React.FC = () => {
  const { toast, hideToast, isSending, sendProgress } = useSMS();

  if (!toast) return null;

  const isTransmitting = toast.type === 'sending' || isSending;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300 border border-white/15 ${
          isTransmitting
            ? 'bg-zinc-950/90 backdrop-blur-2xl text-white min-w-[320px] max-w-md ring-1 ring-white/20'
            : toast.type === 'success'
            ? 'bg-zinc-950/90 backdrop-blur-2xl text-white ring-1 ring-emerald-500/30'
            : toast.type === 'error'
            ? 'bg-zinc-950/90 backdrop-blur-2xl text-white ring-1 ring-red-500/30'
            : 'bg-zinc-950/90 backdrop-blur-2xl text-white'
        }`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {isTransmitting ? (
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
          ) : toast.type === 'success' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
          ) : toast.type === 'warning' ? (
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-sky-400" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight text-zinc-100">
              {toast.title}
            </span>
            {isTransmitting && (
              <span className="text-[10px] font-mono font-medium text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded-full border border-sky-800/50">
                {sendProgress}%
              </span>
            )}
          </div>
          {toast.message && (
            <p className="text-[11px] text-zinc-400 truncate max-w-[280px]">
              {toast.message}
            </p>
          )}

          {/* Real-time Progress Bar for Transmission */}
          {isTransmitting && (
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.max(sendProgress, 8)}%` }}
              />
            </div>
          )}
        </div>

        {/* Close Button */}
        {!isTransmitting && (
          <button
            onClick={hideToast}
            className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
