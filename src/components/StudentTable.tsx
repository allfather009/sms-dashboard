'use client';

import React, { useState } from 'react';
import { useSMS } from '@/context/SMSContext';
import { Student } from '@/types';
import { AddEditStudentModal } from './AddEditStudentModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import { CustomDropdown, DropdownOption } from './CustomDropdown';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';
import Papa from 'papaparse';
import { 
  Search, 
  X, 
  Trash2, 
  Edit3, 
  GraduationCap, 
  Plus, 
  RotateCcw, 
  Phone, 
  Building2, 
  Layers, 
  Users,
  Download,
  Radio,
  SlidersHorizontal
} from 'lucide-react';

export const StudentTable: React.FC = () => {
  const {
    students,
    filteredStudents,
    selectedStudentIds,
    filters,
    departments,
    stages,
    isAllFilteredSelected,
    isSomeFilteredSelected,
    isLoadingStudents,
    directoryMode,
    bulkDeleteStudents,
    bulkUpdateStudents,
    toggleSelectStudent,
    selectAllFiltered,
    setFilters,
    resetFilters,
    createStudent,
    editStudent,
    removeStudent,
    showToast,
  } = useSMS();

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Smart Update Selected Handler
  const handleUpdateSelected = () => {
    if (selectedStudentIds.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Students Selected',
        message: 'Please check at least one student to update.',
      });
      return;
    }

    if (selectedStudentIds.length === 1) {
      // Single Selection Logic: Open standard Edit Student modal
      const student = students.find((s) => s.id === selectedStudentIds[0]);
      if (student) {
        setStudentToEdit(student);
        setIsAddEditOpen(true);
      }
    } else {
      // Multi-Selection Logic: Open special Bulk Update modal (Department & Stage)
      setIsBulkUpdateOpen(true);
    }
  };

  // Bulk Delete Handler
  const handleDeleteSelected = () => {
    if (selectedStudentIds.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Students Selected',
        message: 'Please check at least one student to delete.',
      });
      return;
    }
    setIsBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    await bulkDeleteStudents(selectedStudentIds);
    setIsBulkDeleteOpen(false);
  };

  const handleConfirmBulkUpdate = async (updates: { department?: string; stage?: string }) => {
    return await bulkUpdateStudents(selectedStudentIds, updates);
  };

  // Dropdown filter options for custom dropdowns
  const departmentFilterOptions: DropdownOption[] = [
    { value: 'All', label: 'All Departments' },
    ...departments.map((dept) => ({ value: dept, label: dept })),
  ];

  const stageFilterOptions: DropdownOption[] = [
    { value: 'All', label: 'All Stages' },
    ...stages.map((stg) => ({ value: stg, label: stg })),
  ];

  const carrierFilterOptions: DropdownOption[] = [
    { value: 'All', label: 'All Carriers' },
    { value: 'Asiacell', label: 'Asiacell' },
    { value: 'Zain Iraq', label: 'Zain Iraq' },
    { value: 'Korek', label: 'Korek' },
  ];

  const handleOpenAddModal = () => {
    setStudentToEdit(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditModal = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStudentToEdit(student);
    setIsAddEditOpen(true);
  };

  const handleOpenDeleteModal = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStudentToDelete(student);
  };

  const handleSaveStudent = async (data: {
    studentId: string;
    fullName: string;
    department: string;
    stage: string;
    phoneNumber: string;
  }) => {
    if (studentToEdit) {
      return await editStudent(studentToEdit.id, data);
    } else {
      return await createStudent(data);
    }
  };

  // Badge colors for departments
  const getDeptColor = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes('tech') || d.includes('it')) return 'bg-blue-50 text-[#0071e3] border-blue-200/60';
    if (d.includes('comp') || d.includes('cs')) return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
    if (d.includes('arch') || d.includes('interior')) return 'bg-cyan-50 text-cyan-800 border-cyan-200/60';
    if (d.includes('civil') || d.includes('eng')) return 'bg-amber-50 text-amber-700 border-amber-200/60';
    if (d.includes('bus') || d.includes('admin') || d.includes('finance') || d.includes('account')) return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    if (d.includes('dent') || d.includes('pharm') || d.includes('physio')) return 'bg-rose-50 text-rose-700 border-rose-200/60';
    if (d.includes('medic') || d.includes('nurs')) return 'bg-teal-50 text-teal-700 border-teal-200/60';
    if (d.includes('english') || d.includes('relation') || d.includes('diplom')) return 'bg-purple-50 text-purple-700 border-purple-200/60';
    return 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
  };

  // Badge colors for stages
  const getStageColor = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes('1')) return 'text-sky-600 bg-sky-50 border-sky-200/60';
    if (s.includes('2')) return 'text-indigo-600 bg-indigo-50 border-indigo-200/60';
    if (s.includes('3')) return 'text-violet-600 bg-violet-50 border-violet-200/60';
    if (s.includes('4')) return 'text-emerald-600 bg-emerald-50 border-emerald-200/60';
    if (s.includes('5')) return 'text-amber-600 bg-amber-50 border-amber-200/60';
    return 'text-zinc-600 bg-zinc-100 border-zinc-200/60';
  };

  // Export to Excel (CSV)
  const handleExportSelected = () => {
    // If rows are checked, export only the checked rows.
    // If no rows are checked, default to exporting the currently filtered list in the data table.
    const targetStudents = selectedStudentIds.length > 0
      ? students.filter((s) => selectedStudentIds.includes(s.id))
      : filteredStudents;

    if (targetStudents.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'There are no students to export matching the current selection or filters.',
      });
      return;
    }

    const exportRows = targetStudents.map((s) => ({
      'Student ID': s.studentId,
      'Full Name': s.fullName,
      'Department': s.department,
      'Stage': s.stage,
      'Phone Number': '\t' + s.phoneNumber,
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = selectedStudentIds.length > 0
      ? `students_selected_${selectedStudentIds.length}_${dateStr}.csv`
      : `students_export_${targetStudents.length}_${dateStr}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'CSV Export Generated',
      message: `Exported ${targetStudents.length} student${targetStudents.length !== 1 ? 's' : ''} to ${filename}.`,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* Unified Sticky Control Panel */}
      <div className="sticky top-4 z-20 bg-white/95 backdrop-blur-md shadow-sm border border-slate-200 rounded-xl p-4 mb-4 flex flex-col gap-4 transition-all">
        {/* Top Row (Search & Filters): Global search on left, dropdowns on right */}
        <div className="w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Live Search Input (Full Name, Student ID, Phone Number) */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              placeholder="Filter by Full Name, Student ID, or Phone..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white text-zinc-900 placeholder-zinc-400 rounded-xl border border-transparent focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Custom Dropdown Filters (Department, Stage, Telecom Carrier) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department Dropdown Filter */}
            <CustomDropdown
              id="department-filter-select"
              icon={<Building2 className="w-3.5 h-3.5 text-zinc-400" />}
              options={departmentFilterOptions}
              value={filters.department}
              onChange={(val) => setFilters({ department: val })}
              panelClassName="w-[280px]"
            />

            {/* Stage Dropdown Filter */}
            <CustomDropdown
              id="stage-filter-select"
              icon={<Layers className="w-3.5 h-3.5 text-zinc-400" />}
              options={stageFilterOptions}
              value={filters.stage}
              onChange={(val) => setFilters({ stage: val })}
              panelClassName="w-[200px]"
            />

            {/* Telecom Carrier Dropdown Filter */}
            <CustomDropdown
              id="carrier-filter-select"
              aria-label="Filter by Telecom Carrier"
              icon={<Radio className="w-3.5 h-3.5 text-zinc-400" />}
              options={carrierFilterOptions}
              value={filters.carrier || 'All'}
              onChange={(val) => setFilters({ carrier: val })}
              panelClassName="w-[200px]"
            />

            {/* Reset Filters */}
            {(filters.searchQuery || filters.department !== 'All' || filters.stage !== 'All' || (filters.carrier && filters.carrier !== 'All')) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition-all duration-200 ease-in-out hover:shadow-xs active:scale-[0.96] cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row (Selection Context & Actions) */}
        <div className="w-full flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100">
          {/* Left Side: Dynamic Selection Context */}
          <div className="flex items-center gap-2 text-xs">
            {selectedStudentIds.length > 0 ? (
              <>
                <span className="font-semibold text-zinc-900">
                  {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                </span>
                <span className="text-zinc-400">·</span>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[#0071e3] hover:underline font-medium cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Deselect all' : 'Select all'}
                </button>
              </>
            ) : (
              <span className="text-zinc-500 font-medium">
                Showing <strong className="text-zinc-900 font-semibold">{filteredStudents.length}</strong> of {students.length} students
                {directoryMode === 'manager' && (
                  <>
                    <span className="text-zinc-300 mx-1.5">·</span>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[#0071e3] hover:underline font-medium cursor-pointer"
                    >
                      Select all
                    </button>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Right Side: Grouped Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {directoryMode === 'manager' ? (
              <>
                {/* 1. Update Selected */}
                <button
                  type="button"
                  id="bulk-update-btn"
                  onClick={handleUpdateSelected}
                  disabled={selectedStudentIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 active:scale-[0.98] border border-zinc-200/70 transition-all duration-200 ease-in-out hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={selectedStudentIds.length === 0 ? "Select students to update" : selectedStudentIds.length === 1 ? "Edit selected student" : "Bulk update selected students"}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Update Selected</span>
                  {selectedStudentIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-[#0071e3] font-bold">
                      {selectedStudentIds.length}
                    </span>
                  )}
                </button>

                {/* 2. Delete Selected (Red danger style) */}
                <button
                  type="button"
                  id="bulk-delete-btn"
                  onClick={handleDeleteSelected}
                  disabled={selectedStudentIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 active:scale-[0.98] transition-all duration-200 ease-in-out hover:shadow-md shadow-[0_2px_8px_rgba(225,29,72,0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={selectedStudentIds.length === 0 ? "Select students to delete" : "Permanently delete selected students"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                  {selectedStudentIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
                      {selectedStudentIds.length}
                    </span>
                  )}
                </button>

                {/* 3. Export Selected */}
                <button
                  type="button"
                  onClick={handleExportSelected}
                  disabled={selectedStudentIds.length === 0 || isLoadingStudents}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition-all duration-200 ease-in-out hover:shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={selectedStudentIds.length === 0 ? "Select students to export" : "Export selected students to CSV"}
                >
                  <Download className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Export Selected</span>
                  {selectedStudentIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-[#0071e3] font-bold">
                      {selectedStudentIds.length}
                    </span>
                  )}
                </button>

                {/* 4. + Add Student (Blue primary style) */}
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] active:bg-[#0062c4] active:scale-[0.98] transition-all duration-200 ease-in-out hover:shadow-md shadow-[0_2px_8px_rgba(0,113,227,0.3)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Student</span>
                </button>
              </>
            ) : (
              /* In SMS Directory mode: Clean Export Selected button */
              <button
                type="button"
                onClick={handleExportSelected}
                disabled={isLoadingStudents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition-all duration-200 ease-in-out hover:shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                title={selectedStudentIds.length > 0 ? "Export selected students to CSV" : "Export filtered students to CSV"}
              >
                <Download className="w-3.5 h-3.5 text-zinc-600" />
                <span>Export Selected</span>
                {selectedStudentIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-[#0071e3] font-bold">
                    {selectedStudentIds.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="apple-glass-card rounded-2xl overflow-hidden border border-black/[0.06] shadow-sm">
        {isLoadingStudents ? (
          /* High-Fidelity Skeleton Loader for Student Directory */
          <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-zinc-50/70 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center">
                    <div className="w-4 h-4 rounded bg-slate-200 mx-auto" />
                  </th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Phone Number (Iraq)</th>
                  {directoryMode === 'manager' && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="hover:bg-transparent">
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-4 h-4 rounded bg-slate-200/80 mx-auto" />
                    </td>

                    {/* Student ID */}
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-24 rounded-lg bg-slate-200/80" />
                    </td>

                    {/* Full Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200/80 flex-shrink-0" />
                        <div className="space-y-1.5 flex-1 max-w-[180px]">
                          <div className="h-3.5 w-32 rounded bg-slate-200/80" />
                          <div className="h-2.5 w-20 rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>

                    {/* Department Badge */}
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-36 rounded-full bg-slate-200/80" />
                    </td>

                    {/* Academic Stage Pill */}
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-20 rounded-full bg-slate-200/80" />
                    </td>

                    {/* Phone Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-200/80" />
                        <div className="h-3.5 w-28 rounded bg-slate-200/80" />
                        <div className="h-4 w-12 rounded bg-slate-100" />
                      </div>
                    </td>

                    {/* Actions - Only in Student Manager mode */}
                    {directoryMode === 'manager' && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-200/80" />
                          <div className="w-7 h-7 rounded-lg bg-slate-200/80" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
              <Users className="w-7 h-7" />
            </div>

            {students.length === 0 ? (
              <>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">
                  No Students Registered
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-5">
                  Your Supabase students table is currently empty. Add your first student manually or push seed data.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#0071e3] text-white hover:bg-[#0077ed] transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Student</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">
                  No Matching Students Found
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mb-4">
                  No students matched your search criteria or active filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] bg-zinc-50/70 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold">
                  {/* Select All Checkbox */}
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
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Phone Number (Iraq)</th>
                  {directoryMode === 'manager' && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-xs animate-table-in">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const initial = student.fullName.trim().charAt(0).toUpperCase() || '?';
                  const phoneInfo = normalizeIraqPhoneNumber(student.phoneNumber);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleSelectStudent(student.id)}
                      className={`cursor-pointer transition-colors duration-150 ease-in-out group ${
                        isSelected ? 'bg-blue-50/60 hover:bg-blue-50/90' : 'hover:bg-slate-50'
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
                            onChange={() => toggleSelectStudent(student.id)}
                            className="rounded text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-mono text-[11px] font-semibold border border-zinc-200/70">
                          <GraduationCap className="w-3 h-3 text-[#0071e3]" />
                          <span>{student.studentId}</span>
                        </span>
                      </td>

                      {/* Full Name & Avatar */}
                      <td className="py-3 px-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200/80 text-zinc-700 flex items-center justify-center font-semibold text-xs border border-white shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {student.fullName}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-normal">
                              Registered: {new Date(student.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getDeptColor(
                            student.department
                          )}`}
                        >
                          {student.department}
                        </span>
                      </td>

                      {/* Academic Stage Pill */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStageColor(
                            student.stage
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{student.stage}</span>
                        </span>
                      </td>

                      {/* Phone Number (Bulk SMS Iraq format preview) */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span className="text-zinc-800 font-medium">
                            {phoneInfo.isValid ? phoneInfo.formatted : student.phoneNumber}
                          </span>
                          {phoneInfo.isValid && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                              {phoneInfo.operator}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Menu (Edit, Delete) - Only in Student Manager mode */}
                      {directoryMode === 'manager' && (
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit Student */}
                            <button
                              onClick={(e) => handleOpenEditModal(student, e)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-all duration-150 ease-in-out active:scale-[0.90] cursor-pointer"
                              title="Edit student details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Student */}
                            <button
                              onClick={(e) => handleOpenDeleteModal(student, e)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150 ease-in-out active:scale-[0.90] cursor-pointer"
                              title="Delete student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      <AddEditStudentModal
        isOpen={isAddEditOpen}
        studentToEdit={studentToEdit}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveStudent}
      />

      {/* Single Delete Confirmation Alert Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(studentToDelete)}
        student={studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={async (id) => {
          if (id) await removeStudent(id);
        }}
      />

      {/* Bulk Delete Severe Warning Modal */}
      <DeleteConfirmationModal
        isOpen={isBulkDeleteOpen}
        bulkCount={selectedStudentIds.length}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Bulk Update Cohort Modal */}
      <BulkUpdateModal
        isOpen={isBulkUpdateOpen}
        selectedCount={selectedStudentIds.length}
        departments={departments}
        stages={stages}
        onClose={() => setIsBulkUpdateOpen(false)}
        onConfirm={handleConfirmBulkUpdate}
      />
    </div>
  );
};
