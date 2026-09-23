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
import { fetchCampaignsFromSupabase, saveCampaignToSupabase } from '@/services/campaignService';
import { fetchDepartmentsFromSupabase, DEFAULT_TIU_DEPARTMENTS } from '@/services/departmentService';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizeIraqPhoneNumber } from '@/utils/phoneUtils';
import { VALID_STAGES, normalizeStage } from '@/utils/fileParser';

interface SMSContextType {
  // Student state
  students: Student[];
  selectedStudentIds: string[];
  selectedCount: number;
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
  sendingCurrent: number;
  sendingTotal: number;
  sendingStudentName: string;
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
  carrier: 'All',
};

const DEFAULT_MESSAGE = "Dear {Name} (ID: {StudentID}), please note that your {Department} lectures for {Stage} will proceed as scheduled. Contact department administration for inquiries.";

export const SMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);

  // Targeting options - strictly defaults to manual 'selected' mode with 0 recipients
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('selected');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [targetStage, setTargetStage] = useState<string>('');
  const [targetCombinedDept, setTargetCombinedDept] = useState<string>('');
  const [targetCombinedStage, setTargetCombinedStage] = useState<string>('');

  // SMS Composer & Sending state
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [composerMessage, setComposerMessage] = useState<string>(DEFAULT_MESSAGE);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [sendingCurrent, setSendingCurrent] = useState<number>(0);
  const [sendingTotal, setSendingTotal] = useState<number>(0);
  const [sendingStudentName, setSendingStudentName] = useState<string>('');
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<SMSBatchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'contacts' | 'upload' | 'campaigns' | 'settings'>('students');

  // Prevent user from accidentally closing or refreshing tab during bulk broadcast
  useEffect(() => {
    if (!isSending) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSending]);

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
    // Strictly default selection to 0; only increases when user manually checks a box
    setSelectedStudentIds([]);
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
        // Zero students selected by default on initial load
        setSelectedStudentIds([]);
        setTargetDepartments([]);
        setTargetingMode('selected');
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

  // Filtered students by search query (Full Name, Student ID, Phone Number), Department, Stage, and Telecom Carrier
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

      // Iraqi telecom prefixes:
      // Asiacell: 96477
      // Zain Iraq: 96478 or 96479
      // Korek: 96475
      const rawDigits = s.phoneNumber.replace(/[^0-9]/g, '');
      const standardPhone = rawDigits.startsWith('00964')
        ? rawDigits.substring(2)
        : rawDigits.startsWith('07')
        ? '964' + rawDigits.substring(1)
        : rawDigits.startsWith('7') && rawDigits.length === 10
        ? '964' + rawDigits
        : rawDigits;

      const matchesCarrier = (() => {
        if (!filters.carrier || filters.carrier === 'All') return true;
        if (filters.carrier === 'Asiacell') {
          return standardPhone.startsWith('96477');
        }
        if (filters.carrier === 'Zain Iraq' || filters.carrier === 'Zain') {
          return standardPhone.startsWith('96478') || standardPhone.startsWith('96479');
        }
        if (filters.carrier === 'Korek' || filters.carrier === 'Korek Telecom') {
          return standardPhone.startsWith('96475');
        }
        return true;
      })();

      return matchesSearch && matchesDept && matchesStage && matchesCarrier;
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
        if (!targetStage || targetStage === 'All') return [];
        return students.filter((s) => s.stage.toLowerCase() === targetStage.toLowerCase());
      }
      case 'combined': {
        if (!targetCombinedDept || !targetCombinedStage) return [];
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
    setSendProgress(0);
    setSendingCurrent(0);
    setSendingTotal(resolvedRecipients.length);
    setSendingStudentName('');

    showToast({
      type: 'sending',
      title: 'Transmitting Broadcast',
      message: `Starting throttled broadcast for ${resolvedRecipients.length} students (5s delay between messages)...`,
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

      // Generate a batch identifier for this broadcast
      const batchId = `TIU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const startTime = Date.now();
      const results: Array<{
        id?: string;
        name?: string;
        phoneNumber?: string;
        originalPhone?: string;
        department?: string;
        stage?: string;
        studentId?: string;
        success: boolean;
        error?: string;
      }> = [];

      let deliveredCount = 0;
      let failedCount = 0;

      // Sequential throttled dispatch: strict 5000ms delay between consecutive requests
      for (let i = 0; i < normalizedRecipients.length; i++) {
        const student = normalizedRecipients[i];
        setSendingCurrent(i + 1);
        setSendingStudentName(student.name);

        // Strict 5-second delay before sending each message after the first one
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        try {
          const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipients: [student],
              message: composerMessage,
              batchId,
              skipCampaignLog: true,
            }),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            deliveredCount++;
            results.push({
              id: student.id,
              name: student.name,
              phoneNumber: student.phoneNumber,
              originalPhone: student.phoneNumber,
              department: student.department,
              stage: student.stage,
              studentId: student.studentId,
              success: true,
            });
          } else {
            failedCount++;
            results.push({
              id: student.id,
              name: student.name,
              phoneNumber: student.phoneNumber,
              originalPhone: student.phoneNumber,
              department: student.department,
              stage: student.stage,
              studentId: student.studentId,
              success: false,
              error: data.error || 'Failed to dispatch SMS',
            });
          }
        } catch (dispatchErr: unknown) {
          failedCount++;
          results.push({
            id: student.id,
            name: student.name,
            phoneNumber: student.phoneNumber,
            originalPhone: student.phoneNumber,
            department: student.department,
            stage: student.stage,
            studentId: student.studentId,
            success: false,
            error: dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr),
          });
        }

        const percent = Math.round(((i + 1) / normalizedRecipients.length) * 100);
        setSendProgress(percent);
      }

      const totalSegments = normalizedRecipients.length;
      const batchResult: SMSBatchResult = {
        batchId,
        status: deliveredCount > 0 ? (failedCount === 0 ? 'delivered' : 'partially_delivered') : 'failed',
        recipientCount: normalizedRecipients.length,
        totalSegments,
        deliveredCount,
        failedCount,
        messagePreview: composerMessage.substring(0, 80),
        sentAt: new Date().toISOString(),
        recipients: results.map((r, idx) => ({
          id: r.id || `${batchId}-r-${idx}`,
          name: r.name || r.phoneNumber || `Recipient ${idx + 1}`,
          phoneNumber: r.phoneNumber || '',
          department: r.department || '',
          stage: r.stage || '',
        })),
        providerDetails: {
          providerName: 'Standing Tech (Bulk SMS Iraq v4 - Throttled)',
          latencyMs: Date.now() - startTime,
          simulated: false,
          endpointPlaceholder: 'Live Carrier Gateway (5s Rate Limited)',
        },
      };

      // Persist the consolidated campaign audit log
      await saveCampaignToSupabase(batchResult);

      setCampaignHistory((prev) => [batchResult, ...prev]);

      showToast({
        type: failedCount === 0 ? 'success' : 'warning',
        title: failedCount === 0 ? 'SMS Broadcast Complete' : 'Broadcast Finished with Warnings',
        message:
          failedCount === 0
            ? `Successfully sent ${deliveredCount} SMS messages with 5s throttling.`
            : `Delivered ${deliveredCount} of ${normalizedRecipients.length} messages (${failedCount} failed).`,
        duration: 6000,
      });

      setTimeout(() => {
        setIsComposerOpen(false);
      }, 1000);

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
      setSendingCurrent(0);
      setSendingTotal(0);
      setSendingStudentName('');
    }
  }, [resolvedRecipients, composerMessage, showToast]);

  // Backwards compatibility mappings
  const contacts: Contact[] = useMemo(() => students.map(mapStudentToContact), [students]);
  const filteredContacts: Contact[] = useMemo(() => filteredStudents.map(mapStudentToContact), [filteredStudents]);
  const selectedContacts: Contact[] = useMemo(() => {
    const idSet = new Set(selectedStudentIds);
    return students.filter((s) => idSet.has(s.id)).map(mapStudentToContact);
  }, [students, selectedStudentIds]);

  const loadSampleData = useCallback(() => {
    refreshStudents();
  }, [refreshStudents]);

  return (
    <SMSContext.Provider
      value={{
        students,
        selectedStudentIds,
        selectedCount: selectedStudentIds.length,
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
        sendingCurrent,
        sendingTotal,
        sendingStudentName,
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
