'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Student, Contact, FilterState, SMSBatchResult, ToastNotification, TargetingMode } from '@/types';
import { 
  fetchStudentsFromSupabase, 
  insertStudentToSupabase, 
  updateStudentInSupabase, 
  deleteStudentFromSupabase,
  mapStudentToContact
} from '@/services/studentService';
import { fetchCampaignsFromSupabase } from '@/services/campaignService';
import { fetchDepartmentsFromSupabase, DEFAULT_TIU_DEPARTMENTS } from '@/services/departmentService';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';
import { VALID_STAGES, normalizeStage } from '@/utils/fileParser';

interface SMSContextType {
  // Student state
  students: Student[];
  selectedStudentIds: string[];
  isLoadingStudents: boolean;
  isSupabaseLive: boolean;

  // Filter state
  filters: FilterState;
  filteredStudents: Student[];
  departments: string[];
  stages: string[];
  isAllFilteredSelected: boolean;
  isSomeFilteredSelected: boolean;

  // Targeting options for SMS Composer
  targetingMode: TargetingMode;
  targetDepartments: string[];
  targetStage: string;
  targetCombinedDept: string;
  targetCombinedStage: string;
  resolvedRecipients: Student[];
  targetSummaryText: string;

  // Composer & Dispatch state
  isComposerOpen: boolean;
  composerMessage: string;
  isSending: boolean;
  sendProgress: number;
  toast: ToastNotification | null;
  campaignHistory: SMSBatchResult[];
  activeTab: 'students' | 'contacts' | 'upload' | 'campaigns' | 'settings';

  // Backwards compatibility aliases
  contacts: Contact[];
  selectedContacts: Contact[];
  filteredContacts: Contact[];
  selectedContactIds: string[];
  isLoadingContacts: boolean;
  addContacts: (newContacts: Contact[], append?: boolean) => void;

  // Actions
  setActiveTab: (tab: 'students' | 'contacts' | 'upload' | 'campaigns' | 'settings') => void;
  setFilters: (update: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleSelectStudent: (id: string) => void;
  selectAllFiltered: () => void;
  deselectAll: () => void;

  // CRUD Actions
  createStudent: (data: {
    studentId: string;
    fullName: string;
    department: string;
    stage: string;
    phoneNumber: string;
  }) => Promise<{ success: boolean; error?: string }>;
  editStudent: (
    id: string,
    data: {
      studentId?: string;
      fullName?: string;
      department?: string;
      stage?: string;
      phoneNumber?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  removeStudent: (id: string) => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshDepartments: (force?: boolean) => Promise<void>;

  // Targeting setters
  setTargetingMode: (mode: TargetingMode) => void;
  setTargetDepartments: (depts: string[]) => void;
  toggleTargetDepartment: (dept: string) => void;
  setTargetStage: (stage: string) => void;
  setTargetCombinedDept: (dept: string) => void;
  setTargetCombinedStage: (stage: string) => void;

  // Composer Actions
  setIsComposerOpen: (open: boolean) => void;
  setComposerMessage: (msg: string) => void;
  showToast: (notification: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;
  triggerSendSMS: () => Promise<SMSBatchResult | null>;

  // Legacy aliases
  toggleSelectContact: (id: string) => void;
  removeContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  loadSampleData: () => void;
}

const SMSContext = createContext<SMSContextType | undefined>(undefined);

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  department: 'All',
  stage: 'All',
};

const DEFAULT_MESSAGE = "Dear {Name} (ID: {StudentID}), please note that your {Department} lectures for {Stage} will proceed as scheduled. Contact department administration for inquiries.";

export const SMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);

  // Targeting options
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('department');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [targetStage, setTargetStage] = useState<string>('Stage 1');
  const [targetCombinedDept, setTargetCombinedDept] = useState<string>('Information Technology');
  const [targetCombinedStage, setTargetCombinedStage] = useState<string>('Stage 2');

  // SMS Composer & Sending state
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [composerMessage, setComposerMessage] = useState<string>(DEFAULT_MESSAGE);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<SMSBatchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'contacts' | 'upload' | 'campaigns' | 'settings'>('students');

  // Add imported contacts / students
  const addContacts = useCallback((newContacts: Contact[], append = true) => {
    const convertedStudents: Student[] = newContacts.map((c) => ({
      id: c.id,
      studentId: c.studentId || `U2024-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: c.name,
      department: c.department || 'Information Technology',
      stage: normalizeStage(c.stage, 'Stage 1'),
      phoneNumber: c.phoneNumber,
      createdAt: c.createdAt || new Date().toISOString(),
    }));
    setStudents((prev) => (append ? [...convertedStudents, ...prev] : convertedStudents));
    setSelectedStudentIds((prev) =>
      append ? [...convertedStudents.map((s) => s.id), ...prev] : convertedStudents.map((s) => s.id)
    );
  }, []);

  // Toast Helper
  const showToast = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToast({ ...notification, id, timestamp: Date.now() });

    if (notification.type !== 'sending') {
      const duration = notification.duration || 4500;
      setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, duration);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Fetch students from Supabase
  const refreshStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    const configured = isSupabaseConfigured();
    setIsSupabaseLive(configured);

    if (configured) {
      const [{ data: studentData, error: studentError }, { data: campaignData }] = await Promise.all([
        fetchStudentsFromSupabase(),
        fetchCampaignsFromSupabase(),
      ]);

      if (campaignData && campaignData.length > 0) {
        setCampaignHistory(campaignData);
      }

      if (!studentError && studentData && studentData.length > 0) {
        setStudents(studentData);
        // Pre-select first 3
        setSelectedStudentIds(studentData.slice(0, 3).map((s) => s.id));
        if (studentData[0]?.department) {
          setTargetDepartments([studentData[0].department]);
          setTargetCombinedDept(studentData[0].department);
        }
        if (studentData[0]?.stage) {
          setTargetStage(studentData[0].stage);
          setTargetCombinedStage(studentData[0].stage);
        }
        setIsLoadingStudents(false);
        return;
      }

      if (studentError) {
        console.warn('Supabase students fetch warning:', studentError);
      }
    }

    setIsLoadingStudents(false);
  }, []);

  const [supabaseDepartments, setSupabaseDepartments] = useState<string[]>(DEFAULT_TIU_DEPARTMENTS);

  const refreshDepartments = useCallback(async (force = false) => {
    const { data } = await fetchDepartmentsFromSupabase(force);
    if (data && data.length > 0) {
      setSupabaseDepartments(data);
    }
  }, []);

  useEffect(() => {
    refreshStudents();
    refreshDepartments();
  }, [refreshStudents, refreshDepartments]);

  // Dynamic departments list from Supabase merged with any student departments
  const departments = useMemo(() => {
    const set = new Set<string>(supabaseDepartments);
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [supabaseDepartments, students]);

  // Standard academic stages (Stage 1 to Stage 5 strictly)
  const stages = useMemo(() => {
    return [...VALID_STAGES];
  }, []);

  // Filtered students by search query (Full Name, Student ID, Phone Number), Department, and Stage
  const filteredStudents = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !query ||
        s.fullName.toLowerCase().includes(query) ||
        s.studentId.toLowerCase().includes(query) ||
        s.phoneNumber.toLowerCase().includes(query);

      const matchesDept =
        filters.department === 'All' ||
        s.department.toLowerCase() === filters.department.toLowerCase();

      const matchesStage =
        filters.stage === 'All' ||
        s.stage.toLowerCase() === filters.stage.toLowerCase();

      return matchesSearch && matchesDept && matchesStage;
    });
  }, [students, filters]);

  // Selection states
  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    const selectedMap = new Set(selectedStudentIds);
    return filteredStudents.every((s) => selectedMap.has(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const isSomeFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    const selectedMap = new Set(selectedStudentIds);
    const someSelected = filteredStudents.some((s) => selectedMap.has(s.id));
    return someSelected && !isAllFilteredSelected;
  }, [filteredStudents, selectedStudentIds, isAllFilteredSelected]);

  // Selection actions
  const toggleSelectStudent = useCallback((id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredStudents.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  }, [isAllFilteredSelected, filteredStudents]);

  const deselectAll = useCallback(() => {
    setSelectedStudentIds([]);
  }, []);

  const setFilters = useCallback((update: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Multi-department toggle helper
  const toggleTargetDepartment = useCallback((dept: string) => {
    setTargetDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }, []);

  // Resolved recipients based on selected targeting mode
  const resolvedRecipients = useMemo(() => {
    switch (targetingMode) {
      case 'selected': {
        const idSet = new Set(selectedStudentIds);
        return students.filter((s) => idSet.has(s.id));
      }
      case 'department': {
        if (targetDepartments.length === 0) return [];
        const deptSet = new Set(targetDepartments.map((d) => d.toLowerCase()));
        return students.filter((s) => deptSet.has(s.department.toLowerCase()));
      }
      case 'stage': {
        if (!targetStage || targetStage === 'All') return students;
        return students.filter((s) => s.stage.toLowerCase() === targetStage.toLowerCase());
      }
      case 'combined': {
        return students.filter(
          (s) =>
            s.department.toLowerCase() === targetCombinedDept.toLowerCase() &&
            s.stage.toLowerCase() === targetCombinedStage.toLowerCase()
        );
      }
      default:
        return [];
    }
  }, [
    targetingMode,
    selectedStudentIds,
    students,
    targetDepartments,
    targetStage,
    targetCombinedDept,
    targetCombinedStage,
  ]);

  // Clean dynamic summary string for composer
  const targetSummaryText = useMemo(() => {
    const count = resolvedRecipients.length;
    switch (targetingMode) {
      case 'selected':
        return `Broadcasting to ${count} manually selected student${count !== 1 ? 's' : ''}`;
      case 'department':
        if (targetDepartments.length === 0) return 'No departments selected';
        if (targetDepartments.length === 1)
          return `Broadcasting to ${count} student${count !== 1 ? 's' : ''} in ${targetDepartments[0]}`;
        return `Broadcasting to ${count} student${count !== 1 ? 's' : ''} across ${targetDepartments.length} departments`;
      case 'stage':
        return `Broadcasting to ${count} student${count !== 1 ? 's' : ''} in ${targetStage} across all departments`;
      case 'combined':
        return `Broadcasting to ${count} student${count !== 1 ? 's' : ''}: ${targetCombinedDept} - ${targetCombinedStage}`;
      default:
        return `Broadcasting to ${count} students`;
    }
  }, [targetingMode, resolvedRecipients.length, targetDepartments, targetStage, targetCombinedDept, targetCombinedStage]);

  // CRUD: Create Student
  const createStudent = useCallback(
    async (data: {
      studentId: string;
      fullName: string;
      department: string;
      stage: string;
      phoneNumber: string;
    }) => {
      const normalizedData = {
        ...data,
        stage: normalizeStage(data.stage, 'Stage 1'),
      };
      const { data: newStudent, error } = await insertStudentToSupabase(normalizedData);
      if (error || !newStudent) {
        return { success: false, error: error || 'Failed to create student' };
      }

      setStudents((prev) => [newStudent, ...prev]);
      setSelectedStudentIds((prev) => [newStudent.id, ...prev]);
      showToast({
        type: 'success',
        title: 'Student Registered',
        message: `${newStudent.fullName} (${newStudent.studentId}) added to Supabase.`,
      });
      return { success: true };
    },
    [showToast]
  );

  // CRUD: Edit Student
  const editStudent = useCallback(
    async (
      id: string,
      data: {
        studentId?: string;
        fullName?: string;
        department?: string;
        stage?: string;
        phoneNumber?: string;
      }
    ) => {
      const normalizedData = {
        ...data,
        ...(data.stage ? { stage: normalizeStage(data.stage, 'Stage 1') } : {}),
      };
      const { data: updated, error } = await updateStudentInSupabase(id, normalizedData);
      if (error || !updated) {
        return { success: false, error: error || 'Failed to update student' };
      }

      setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast({
        type: 'success',
        title: 'Student Updated',
        message: `Changes for ${updated.fullName} have been saved.`,
      });
      return { success: true };
    },
    [showToast]
  );

  // CRUD: Delete Student
  const removeStudent = useCallback(
    async (id: string) => {
      const student = students.find((s) => s.id === id);
      const studentName = student ? student.fullName : 'Student';

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setSelectedStudentIds((prev) => prev.filter((item) => item !== id));

      if (isSupabaseConfigured()) {
        const { error } = await deleteStudentFromSupabase(id);
        if (error) {
          showToast({
            type: 'warning',
            title: 'Supabase Sync Warning',
            message: `Deleted locally, but Supabase error: ${error}`,
          });
          return;
        }
      }

      showToast({
        type: 'info',
        title: 'Student Deleted',
        message: `${studentName} removed from university directory.`,
      });
    },
    [students, showToast]
  );

  // Bulk SMS Dispatch
  const triggerSendSMS = useCallback(async (): Promise<SMSBatchResult | null> => {
    if (resolvedRecipients.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Recipients Target',
        message: 'No students matched the active targeting criteria.',
      });
      return null;
    }

    if (!composerMessage.trim()) {
      showToast({
        type: 'warning',
        title: 'Message Required',
        message: 'Please write an SMS message before sending.',
      });
      return null;
    }

    setIsSending(true);
    setSendProgress(10);
    showToast({
      type: 'sending',
      title: 'Transmitting Broadcast',
      message: `Packaging messages for ${resolvedRecipients.length} students...`,
    });

    try {
      // Clean and normalize all recipient phone numbers to Bulk SMS Iraq format
      const normalizedRecipients = resolvedRecipients.map((s) => {
        const norm = normalizeIraqPhoneNumber(s.phoneNumber);
        return {
          id: s.id,
          name: s.fullName,
          phoneNumber: norm.isValid ? norm.normalized : s.phoneNumber,
          department: s.department,
          stage: s.stage,
          studentId: s.studentId,
        };
      });

      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: normalizedRecipients,
          message: composerMessage,
        }),
      });

      setSendProgress(90);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server error dispatching SMS');
      }

      setSendProgress(100);

      const batchResult: SMSBatchResult = {
        batchId: result.batchId || `BATCH-${Date.now()}`,
        status: result.status || 'delivered',
        recipientCount: result.recipientCount || normalizedRecipients.length,
        totalSegments: result.totalSegments || 1,
        deliveredCount: result.deliveredCount || normalizedRecipients.length,
        failedCount: result.failedCount || 0,
        messagePreview: composerMessage.substring(0, 80),
        sentAt: result.sentAt || new Date().toISOString(),
        recipients: normalizedRecipients.map((r) => ({
          id: r.id,
          name: r.name,
          phoneNumber: r.phoneNumber,
          department: r.department,
          stage: r.stage,
        })),
        providerDetails: {
          providerName: result.providerName || 'AirSMS Iraq Gateway',
          latencyMs: result.latencyMs || 2000,
          simulated: Boolean(result.isSimulated),
          endpointPlaceholder: result.isSimulated ? '(Simulation Mode)' : 'Live Carrier Gateway',
        },
      };

      setCampaignHistory((prev) => [batchResult, ...prev]);

      showToast({
        type: 'success',
        title: 'SMS Broadcast Dispatched',
        message: result.message || `Successfully sent to ${normalizedRecipients.length} students.`,
        duration: 5000,
      });

      setTimeout(() => {
        setIsComposerOpen(false);
      }, 500);

      return batchResult;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transmission failed.';
      showToast({
        type: 'error',
        title: 'Transmission Failed',
        message: msg,
        duration: 6000,
      });
      return null;
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  }, [resolvedRecipients, composerMessage, showToast]);

  // Backwards compatibility mappings
  const contacts: Contact[] = useMemo(() => students.map(mapStudentToContact), [students]);
  const filteredContacts: Contact[] = useMemo(() => filteredStudents.map(mapStudentToContact), [filteredStudents]);
  const selectedContacts: Contact[] = useMemo(() => resolvedRecipients.map(mapStudentToContact), [resolvedRecipients]);

  const loadSampleData = useCallback(() => {
    refreshStudents();
  }, [refreshStudents]);

  return (
    <SMSContext.Provider
      value={{
        students,
        selectedStudentIds,
        isLoadingStudents,
        isSupabaseLive,
        filters,
        filteredStudents,
        departments,
        stages,
        isAllFilteredSelected,
        isSomeFilteredSelected,
        targetingMode,
        targetDepartments,
        targetStage,
        targetCombinedDept,
        targetCombinedStage,
        resolvedRecipients,
        targetSummaryText,
        isComposerOpen,
        composerMessage,
        isSending,
        sendProgress,
        toast,
        campaignHistory,
        activeTab,

        // Backwards compatibility
        contacts,
        selectedContacts,
        filteredContacts,
        selectedContactIds: selectedStudentIds,
        isLoadingContacts: isLoadingStudents,
        addContacts,

        // Actions
        setActiveTab,
        setFilters,
        resetFilters,
        toggleSelectStudent,
        selectAllFiltered,
        deselectAll,
        createStudent,
        editStudent,
        removeStudent,
        refreshStudents,
        refreshDepartments,
        setTargetingMode,
        setTargetDepartments,
        toggleTargetDepartment,
        setTargetStage,
        setTargetCombinedDept,
        setTargetCombinedStage,
        setIsComposerOpen,
        setComposerMessage,
        showToast,
        hideToast,
        triggerSendSMS,

        // Aliases
        toggleSelectContact: toggleSelectStudent,
        removeContact: removeStudent,
        refreshContacts: refreshStudents,
        loadSampleData,
      }}
    >
      {children}
    </SMSContext.Provider>
  );
};

export function useSMS(): SMSContextType {
  const context = useContext(SMSContext);
  if (!context) {
    throw new Error('useSMS must be used within an SMSProvider');
  }
  return context;
}
