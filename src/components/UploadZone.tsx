'use client';

import React, { useState, useRef } from 'react';
import { useSMS } from '@/context/SMSContext';
import { parseContactFile, downloadSampleCSV, getSampleContacts } from '@/utils/fileParser';
import { batchInsertContactsToSupabase } from '@/services/contactService';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { 
  UploadCloud, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  Plus,
  Database
} from 'lucide-react';

export const UploadZone: React.FC = () => {
  const { addContacts, contacts, setActiveTab, showToast } = useSMS();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{
    fileName: string;
    count: number;
    columns: string[];
    persistedToSupabase: boolean;
  } | null>(null);
  const [appendMode, setAppendMode] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const result = await parseContactFile(file);

      if (result.contacts.length === 0) {
        throw new Error('No valid contacts found. Ensure the file includes phone numbers and names.');
      }

      let persisted = false;

      // Batch insert to Supabase if configured
      if (isSupabaseConfigured()) {
        const insertRes = await batchInsertContactsToSupabase(result.contacts);
        if (insertRes.error) {
          console.warn('Supabase batch insert error:', insertRes.error);
          showToast({
            type: 'warning',
            title: 'Saved Locally',
            message: `Could not reach Supabase (${insertRes.error}). Contacts saved to local workspace.`,
            duration: 6000,
          });
          // Fall back to local array
          addContacts(result.contacts, appendMode);
        } else {
          persisted = true;
          // Use contacts with Supabase-generated UUIDs
          addContacts(insertRes.insertedContacts, appendMode);
          showToast({
            type: 'success',
            title: 'Saved to Supabase DB',
            message: `Successfully batch-inserted ${insertRes.count} contacts to public.contacts table.`,
          });
        }
      } else {
        // Local mode
        addContacts(result.contacts, appendMode);
        showToast({
          type: 'info',
          title: 'Imported Locally',
          message: `${result.contacts.length} contacts imported. Add Supabase URL in .env.local for database persistence.`,
        });
      }

      setImportStats({
        fileName: file.name,
        count: result.contacts.length,
        columns: result.columnsFound,
        persistedToSupabase: persisted,
      });

      // Auto-switch to contacts tab after brief delay
      setTimeout(() => {
        setActiveTab('contacts');
      }, 1600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Card */}
      <div className="apple-glass-card rounded-3xl p-8 transition-all relative overflow-hidden">
        {/* Decorative background gradient */}
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-700 text-xs font-semibold mb-4">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Cloud Database Pipeline</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-2">
            Import & Sync Recipient Contacts
          </h2>
          <p className="text-sm text-zinc-500 max-w-lg mb-8 leading-relaxed">
            Drag and drop your contact spreadsheet. Files are parsed on the client side and{' '}
            <span className="font-semibold text-zinc-800">batch-inserted directly into Supabase</span> with full RLS policy support.
          </p>

          {/* Drag and drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
              isDragOver
                ? 'border-[#0071e3] bg-blue-50/60 scale-[1.01] shadow-lg'
                : 'border-zinc-300 hover:border-zinc-400 bg-white/50 hover:bg-white/90 shadow-sm'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-zinc-100 group-hover:bg-blue-100/80 group-hover:text-[#0071e3] text-zinc-600 flex items-center justify-center transition-all duration-300 shadow-sm mb-4">
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 animate-spin text-[#0071e3]" />
              ) : (
                <UploadCloud className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-zinc-800">
                {isProcessing
                  ? 'Parsing & Batch Inserting to Database...'
                  : 'Click to select or drag & drop file here'}
              </p>
              <p className="text-xs text-zinc-400">
                Supports <span className="font-mono text-zinc-600">.CSV</span>,{' '}
                <span className="font-mono text-zinc-600">.XLSX</span>, and{' '}
                <span className="font-mono text-zinc-600">.XLS</span> (batch inserts to Supabase)
              </p>
            </div>
          </div>

          {/* Import options & controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-600 bg-zinc-100/80 hover:bg-zinc-200/80 px-3 py-1.5 rounded-xl transition-colors">
              <input
                type="checkbox"
                checked={appendMode}
                onChange={(e) => setAppendMode(e.target.checked)}
                className="rounded text-[#0071e3] focus:ring-[#0071e3] w-3.5 h-3.5"
              />
              <span>Append to existing contacts ({contacts.length} currently loaded)</span>
            </label>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-6 w-full max-w-xl p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 text-left animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Import Success Banner */}
          {importStats && (
            <div className="mt-6 w-full max-w-xl p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 text-left animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <div className="flex-1">
                <div className="font-semibold">
                  Successfully parsed {importStats.count} contacts from &ldquo;{importStats.fileName}&rdquo;!
                </div>
                <div className="text-emerald-700/80 mt-0.5 text-[11px]">
                  {importStats.persistedToSupabase
                    ? '✓ Batch-inserted into Supabase public.contacts table'
                    : 'Populated into local workspace. Add your Supabase project URL in .env.local to persist to cloud.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Helper Tools Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sample Dataset Loader */}
        <div className="apple-glass-card rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              Need sample data to evaluate?
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 mb-3 leading-relaxed">
              Instantly populate your dashboard with 12 enterprise contacts across Sales, Engineering, HR, and Product.
            </p>
            <button
              onClick={() => {
                const samples = getSampleContacts();
                addContacts(samples, appendMode);
                setActiveTab('contacts');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Load 12 Sample Contacts</span>
            </button>
          </div>
        </div>

        {/* Template Downloader */}
        <div className="apple-glass-card rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              Download CSV Template
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 mb-3 leading-relaxed">
              Get a clean CSV template matching the exact schema columns for seamless bulk uploads to Supabase.
            </p>
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Download .CSV Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
