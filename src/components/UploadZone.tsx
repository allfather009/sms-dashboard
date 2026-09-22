'use client';

import React, { useState, useRef } from 'react';
import { useSMS } from '@/context/SMSContext';
import { parseContactFile, downloadSampleCSV } from '@/utils/fileParser';
import { batchInsertStudentsToSupabase } from '@/services/studentService';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  GraduationCap,
  Layers
} from 'lucide-react';
import { VALID_STAGES, ValidStage } from '@/utils/fileParser';

export const UploadZone: React.FC = () => {
  const { addContacts, refreshStudents, students, setActiveTab, showToast } = useSMS();
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
  const [stageMappingOption, setStageMappingOption] = useState<string>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const parseOptions = stageMappingOption === 'auto'
        ? { defaultStage: 'Stage 1' as ValidStage }
        : { defaultStage: stageMappingOption as ValidStage, overrideStage: stageMappingOption as ValidStage };

      const result = await parseContactFile(file, parseOptions);

      if (result.students.length === 0) {
        throw new Error('No valid students found. Ensure the file includes Student ID, Name, and Iraqi Phone Numbers.');
      }

      let persisted = false;

      // Batch insert directly into public.students in Supabase
      if (isSupabaseConfigured()) {
        const insertRes = await batchInsertStudentsToSupabase(result.students);
        if (insertRes.error) {
          console.warn('Supabase batch insert error:', insertRes.error);
          showToast({
            type: 'warning',
            title: 'Saved Locally',
            message: `Could not reach Supabase (${insertRes.error}). Students saved to local state.`,
            duration: 6000,
          });
          // Fall back to local state
          addContacts(result.contacts, appendMode);
        } else {
          persisted = true;
          await refreshStudents();
          showToast({
            type: 'success',
            title: 'Saved to Supabase DB',
            message: `Successfully batch-inserted ${insertRes.count} students into public.students.`,
          });
        }
      } else {
        // Local mode
        addContacts(result.contacts, appendMode);
        showToast({
          type: 'info',
          title: 'Imported Locally',
          message: `${result.students.length} students imported into workspace.`,
        });
      }

      setImportStats({
        fileName: file.name,
        count: result.students.length,
        columns: result.columnsFound,
        persistedToSupabase: persisted,
      });

      // Auto-switch to students tab after brief delay
      setTimeout(() => {
        setActiveTab('students');
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

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileProcess(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Card */}
      <div className="apple-glass-card rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden border border-black/[0.06] shadow-sm">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          {/* Header */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center mb-3.5 shadow-xs border border-blue-200/50">
            <GraduationCap className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-1">
            Import Student Directory
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-6 max-w-md leading-relaxed">
            Upload student lists from Excel or CSV files. Auto-detects Student ID, Full Name, Department, Stage, and formats Iraqi mobile numbers.
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
                  ? 'Parsing & Batch Inserting to Supabase students table...'
                  : 'Click to select or drag & drop student file here'}
              </p>
              <p className="text-xs text-zinc-400">
                Supports <span className="font-mono text-zinc-600">.CSV</span>,{' '}
                <span className="font-mono text-zinc-600">.XLSX</span>, and{' '}
                <span className="font-mono text-zinc-600">.XLS</span>
              </p>
            </div>
          </div>

          {/* Import options & controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs w-full max-w-xl">
            {/* Academic Stage Mapping Dropdown */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/90 px-3 py-2 rounded-xl text-zinc-700 shadow-xs">
              <Layers className="w-3.5 h-3.5 text-[#0071e3] flex-shrink-0" />
              <label htmlFor="csv-stage-select" className="font-medium whitespace-nowrap text-zinc-700">
                Stage Mapping:
              </label>
              <select
                id="csv-stage-select"
                value={stageMappingOption}
                onChange={(e) => setStageMappingOption(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer text-xs"
              >
                <option value="auto">Auto-detect (Strict Stage 1–5)</option>
                {VALID_STAGES.map((stg) => (
                  <option key={stg} value={stg}>
                    Assign all to {stg}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-600 bg-zinc-100/80 hover:bg-zinc-200/80 px-3 py-2 rounded-xl transition-colors">
              <input
                type="checkbox"
                checked={appendMode}
                onChange={(e) => setAppendMode(e.target.checked)}
                className="rounded text-[#0071e3] focus:ring-[#0071e3] w-3.5 h-3.5"
              />
              <span>Append ({students.length} loaded)</span>
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
                  Successfully parsed {importStats.count} students from &ldquo;{importStats.fileName}&rdquo;!
                </div>
                <div className="text-emerald-700/80 mt-0.5 text-[11px]">
                  {importStats.persistedToSupabase
                    ? '✓ Batch-inserted into live Supabase public.students table'
                    : 'Imported into current session.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Template Downloader */}
      <div className="apple-glass-card rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">
            Download Student Import Template (.CSV)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 mb-3 leading-relaxed">
            Get a pre-formatted template with Student ID, Full Name, Department, Academic Stage, and Iraqi Phone Numbers for flawless batch uploads.
          </p>
          <button
            onClick={downloadSampleCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] transition-all duration-200 ease-in-out hover:shadow-sm cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Download Iraq Student Template (.CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
