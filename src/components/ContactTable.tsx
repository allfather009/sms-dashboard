'use client';

import React, { useState } from 'react';
import { useSMS } from '@/context/SMSContext';
import { 
  Search, 
  X, 
  Send, 
  Trash2, 
  Users, 
  Sparkles, 
  RotateCcw,
  Phone,
  Building2,
  GitCommit,
  RefreshCw,
  Database,
  Plus,
  Loader2
} from 'lucide-react';

export const ContactTable: React.FC = () => {
  const {
    contacts,
    filteredContacts,
    selectedContactIds,
    filters,
    departments,
    stages,
    isAllFilteredSelected,
    isSomeFilteredSelected,
    isLoadingContacts,
    isSupabaseLive,
    toggleSelectContact,
    selectAllFiltered,
    deselectAll,
    setFilters,
    resetFilters,
    removeContact,
    setIsComposerOpen,
    loadSampleData,
    setActiveTab,
    refreshContacts,
  } = useSMS();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshContacts();
    setIsRefreshing(false);
  };

  // Helper for Department badge color schemes
  const getDeptColor = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes('sale')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    if (d.includes('eng')) return 'bg-blue-50 text-blue-700 border-blue-200/60';
    if (d.includes('res') || d.includes('hr')) return 'bg-purple-50 text-purple-700 border-purple-200/60';
    if (d.includes('prod')) return 'bg-amber-50 text-amber-700 border-amber-200/60';
    if (d.includes('market')) return 'bg-rose-50 text-rose-700 border-rose-200/60';
    return 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
  };

  // Helper for Stage badge color schemes
  const getStageColor = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes('1')) return 'text-sky-600 bg-sky-50 border-sky-200/60';
    if (s.includes('2')) return 'text-indigo-600 bg-indigo-50 border-indigo-200/60';
    if (s.includes('3')) return 'text-violet-600 bg-violet-50 border-violet-200/60';
    if (s.includes('4') || s.includes('closed')) return 'text-emerald-600 bg-emerald-50 border-emerald-200/60';
    return 'text-zinc-600 bg-zinc-100 border-zinc-200/60';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Top Filter & Search Controls Bar */}
      <div className="apple-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Search Bar & Primary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              placeholder="Search by name or phone number..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white text-zinc-900 placeholder-zinc-400 rounded-xl border border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Database Sync Status & Refresh Button */}
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Supabase Status Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isSupabaseLive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
              title={isSupabaseLive ? 'Connected to live Supabase database' : 'Running in local mode'}
            >
              <Database className="w-3 h-3" />
              <span>{isSupabaseLive ? 'Supabase Cloud DB' : 'Local Directory'}</span>
            </div>

            {/* Sync / Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoadingContacts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 rounded-xl transition-all disabled:opacity-50"
              title="Sync table from Supabase database"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#0071e3]' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Reset Filters Button */}
            {(filters.searchQuery || filters.department !== 'All' || filters.stage !== 'All') && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 rounded-xl transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            <span className="text-xs text-zinc-500 font-medium px-2 py-1">
              Showing <span className="font-semibold text-zinc-900">{filteredContacts.length}</span> of{' '}
              <span className="font-semibold text-zinc-900">{contacts.length}</span> contacts
            </span>
          </div>
        </div>

        {/* Filter Pills Section */}
        <div className="pt-2 border-t border-black/[0.04] space-y-3">
          {/* Department Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-medium mr-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>Department:</span>
            </span>
            <button
              onClick={() => setFilters({ department: 'All' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filters.department === 'All'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/70'
              }`}
            >
              All ({contacts.length})
            </button>
            {departments.map((dept) => {
              const count = contacts.filter((c) => c.department.toLowerCase() === dept.toLowerCase()).length;
              const isSelected = filters.department.toLowerCase() === dept.toLowerCase();
              return (
                <button
                  key={dept}
                  onClick={() => setFilters({ department: isSelected ? 'All' : dept })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/70'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>

          {/* Stage Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-medium mr-1.5 flex items-center gap-1">
              <GitCommit className="w-3 h-3" />
              <span>Stage:</span>
            </span>
            <button
              onClick={() => setFilters({ stage: 'All' })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filters.stage === 'All'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/70'
              }`}
            >
              All ({contacts.length})
            </button>
            {stages.map((stg) => {
              const count = contacts.filter((c) => c.stage.toLowerCase() === stg.toLowerCase()).length;
              const isSelected = filters.stage.toLowerCase() === stg.toLowerCase();
              return (
                <button
                  key={stg}
                  onClick={() => setFilters({ stage: isSelected ? 'All' : stg })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/70'
                  }`}
                >
                  {stg} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Selection Banner when items are selected */}
      {selectedContactIds.length > 0 && (
        <div className="apple-glass rounded-2xl px-5 py-3 flex items-center justify-between gap-4 border border-blue-200/60 bg-blue-50/70 text-zinc-900 shadow-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white flex items-center justify-center font-bold text-xs">
              {selectedContactIds.length}
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                {selectedContactIds.length} recipient{selectedContactIds.length !== 1 ? 's' : ''} selected
              </span>
              <p className="text-[11px] text-zinc-500">
                Ready for bulk SMS composition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={deselectAll}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-xl hover:bg-black/[0.04] transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] active:scale-[0.98] transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send SMS ({selectedContactIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Modern Data Table */}
      <div className="apple-glass-card rounded-2xl overflow-hidden border border-black/[0.06] shadow-sm">
        {isLoadingContacts ? (
          /* Loading State */
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#0071e3]" />
            <span className="text-xs font-semibold text-zinc-600">
              Querying contacts from Supabase database...
            </span>
          </div>
        ) : filteredContacts.length === 0 ? (
          /* Empty Search or Empty Dataset View */
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
              <Users className="w-7 h-7" />
            </div>

            {contacts.length === 0 ? (
              <>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">
                  No Contacts in Workspace
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-5">
                  Import contacts using an Excel or CSV file to batch-insert into Supabase, or load the built-in sample dataset.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadSampleData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Load 12 Sample Contacts</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload CSV / Excel</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">
                  No Matching Contacts
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-4">
                  No contacts found matching your current search query or active filter tags.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] bg-zinc-50/70 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold">
                  {/* Select All Checkbox Column */}
                  <th className="py-3 px-4 w-12 text-center">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isSomeFilteredSelected;
                        }}
                        onChange={selectAllFiltered}
                        className="rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                        title={isAllFilteredSelected ? 'Deselect all filtered' : 'Select all filtered'}
                      />
                    </div>
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-xs">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  const initial = contact.name.trim().charAt(0).toUpperCase() || '?';

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => toggleSelectContact(contact.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-blue-50/50 hover:bg-blue-50/80'
                          : 'hover:bg-zinc-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectContact(contact.id)}
                            className="rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3 px-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200/80 text-zinc-700 flex items-center justify-center font-semibold text-xs border border-white shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {contact.name}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-normal font-mono">
                              {contact.id.length > 15 ? `${contact.id.substring(0, 8)}...` : contact.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3 px-4 text-zinc-700 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{contact.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Department Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getDeptColor(
                            contact.department
                          )}`}
                        >
                          {contact.department}
                        </span>
                      </td>

                      {/* Stage Pill */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStageColor(
                            contact.stage
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{contact.stage}</span>
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (!isSelected) toggleSelectContact(contact.id);
                              setIsComposerOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-[#0071e3] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Compose message for this contact"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeContact(contact.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete contact from Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
