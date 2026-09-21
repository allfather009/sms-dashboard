'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Contact, FilterState, SMSBatchResult, ToastNotification } from '@/types';
import { sendBulkSMS } from '@/services/smsService';
import { getSampleContacts } from '@/utils/fileParser';
import { 
  fetchContactsFromSupabase, 
  deleteContactFromSupabase 
} from '@/services/contactService';
import { 
  fetchCampaignsFromSupabase, 
  saveCampaignToSupabase 
} from '@/services/campaignService';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface SMSContextType {
  contacts: Contact[];
  selectedContactIds: string[];
  filters: FilterState;
  isComposerOpen: boolean;
  composerMessage: string;
  isSending: boolean;
  sendProgress: number;
  toast: ToastNotification | null;
  campaignHistory: SMSBatchResult[];
  activeTab: 'contacts' | 'upload' | 'campaigns' | 'settings';
  isLoadingContacts: boolean;
  isSupabaseLive: boolean;
  
  // Computed values
  filteredContacts: Contact[];
  selectedContacts: Contact[];
  departments: string[];
  stages: string[];
  isAllFilteredSelected: boolean;
  isSomeFilteredSelected: boolean;

  // Actions
  setActiveTab: (tab: 'contacts' | 'upload' | 'campaigns' | 'settings') => void;
  setContacts: (contacts: Contact[]) => void;
  addContacts: (newContacts: Contact[], append?: boolean) => void;
  removeContact: (id: string) => Promise<void>;
  clearAllContacts: () => void;
  toggleSelectContact: (id: string) => void;
  selectAllFiltered: () => void;
  deselectAll: () => void;
  setFilters: (update: Partial<FilterState>) => void;
  resetFilters: () => void;
  setIsComposerOpen: (open: boolean) => void;
  setComposerMessage: (message: string) => void;
  showToast: (notification: Omit<ToastNotification, 'id'>) => void;
  hideToast: () => void;
  triggerSendSMS: () => Promise<SMSBatchResult | null>;
  loadSampleData: () => void;
  refreshContacts: () => Promise<void>;
}

const SMSContext = createContext<SMSContextType | undefined>(undefined);

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  department: 'All',
  stage: 'All',
};

const DEFAULT_MESSAGE = "Hi {Name}, this is an update regarding your {Department} project in {Stage}. Please let us know if you have any questions.";

export const SMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [composerMessage, setComposerMessage] = useState<string>(DEFAULT_MESSAGE);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<SMSBatchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'upload' | 'campaigns' | 'settings'>('contacts');
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(true);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);

  // Show toast notification helper
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

  // Fetch contacts from Supabase (or fallback to local sample data)
  const refreshContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    const configured = isSupabaseConfigured();
    setIsSupabaseLive(configured);

    if (configured) {
      const [{ data: contactData, error: contactError }, { data: campaignData }] = await Promise.all([
        fetchContactsFromSupabase(),
        fetchCampaignsFromSupabase(),
      ]);

      if (campaignData && campaignData.length > 0) {
        setCampaignHistory(campaignData);
      }

      if (!contactError && contactData.length > 0) {
        setContacts(contactData);
        // Pre-select first 3
        setSelectedContactIds(contactData.slice(0, 3).map((c) => c.id));
        setIsLoadingContacts(false);
        return;
      }
      if (contactError) {
        console.warn('Supabase fetch notice:', contactError);
      }
    }

    // Fallback to sample data for evaluation
    const samples = getSampleContacts();
    setContacts(samples);
    setSelectedContactIds([samples[0].id, samples[1].id, samples[2].id]);
    setIsLoadingContacts(false);
  }, []);

  // Load data on mount
  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  // Unique departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.department) set.add(c.department);
    });
    return Array.from(set).sort();
  }, [contacts]);

  // Unique stages list
  const stages = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.stage) set.add(c.stage);
    });
    return Array.from(set).sort();
  }, [contacts]);

  // Filtered contacts based on search query, department, stage
  const filteredContacts = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.phoneNumber.toLowerCase().includes(query);

      const matchesDept =
        filters.department === 'All' ||
        c.department.toLowerCase() === filters.department.toLowerCase();

      const matchesStage =
        filters.stage === 'All' ||
        c.stage.toLowerCase() === filters.stage.toLowerCase();

      return matchesSearch && matchesDept && matchesStage;
    });
  }, [contacts, filters]);

  // Selected contacts objects
  const selectedContacts = useMemo(() => {
    const selectedMap = new Set(selectedContactIds);
    return contacts.filter((c) => selectedMap.has(c.id));
  }, [contacts, selectedContactIds]);

  // Selection states relative to filtered view
  const isAllFilteredSelected = useMemo(() => {
    if (filteredContacts.length === 0) return false;
    const selectedMap = new Set(selectedContactIds);
    return filteredContacts.every((c) => selectedMap.has(c.id));
  }, [filteredContacts, selectedContactIds]);

  const isSomeFilteredSelected = useMemo(() => {
    if (filteredContacts.length === 0) return false;
    const selectedMap = new Set(selectedContactIds);
    const someSelected = filteredContacts.some((c) => selectedMap.has(c.id));
    return someSelected && !isAllFilteredSelected;
  }, [filteredContacts, selectedContactIds, isAllFilteredSelected]);

  // Contact operations
  const addContacts = useCallback((newContacts: Contact[], append = true) => {
    setContacts((prev) => (append ? [...newContacts, ...prev] : newContacts));
    setSelectedContactIds((prev) =>
      append ? [...newContacts.map((c) => c.id), ...prev] : newContacts.map((c) => c.id)
    );
  }, []);

  const removeContact = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setSelectedContactIds((prev) => prev.filter((item) => item !== id));
    
    // Delete in Supabase if configured
    if (isSupabaseConfigured()) {
      const { error } = await deleteContactFromSupabase(id);
      if (error) {
        showToast({
          type: 'warning',
          title: 'Supabase Sync Warning',
          message: `Removed locally, but Supabase error: ${error}`,
        });
        return;
      }
    }

    showToast({
      type: 'info',
      title: 'Contact Removed',
      message: 'Contact deleted from directory.',
      duration: 3000,
    });
  }, [showToast]);

  const clearAllContacts = useCallback(() => {
    setContacts([]);
    setSelectedContactIds([]);
    showToast({
      type: 'info',
      title: 'Workspace Cleared',
      message: 'All contacts have been removed.',
    });
  }, [showToast]);

  const loadSampleData = useCallback(() => {
    const samples = getSampleContacts();
    setContacts(samples);
    setSelectedContactIds(samples.map((c) => c.id));
    showToast({
      type: 'success',
      title: 'Sample Dataset Loaded',
      message: `Populated ${samples.length} enterprise contacts across 4 departments.`,
    });
  }, [showToast]);

  // Selection operations
  const toggleSelectContact = useCallback((id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    const filteredIds = filteredContacts.map((c) => c.id);
    setSelectedContactIds((prev) => {
      const currentSet = new Set(prev);
      const allFilteredInCurrent = filteredIds.every((id) => currentSet.has(id));

      if (allFilteredInCurrent) {
        return prev.filter((id) => !filteredIds.includes(id));
      } else {
        filteredIds.forEach((id) => currentSet.add(id));
        return Array.from(currentSet);
      }
    });
  }, [filteredContacts]);

  const deselectAll = useCallback(() => {
    setSelectedContactIds([]);
  }, []);

  // Filter updates
  const setFilters = useCallback((update: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Trigger Send SMS
  const triggerSendSMS = useCallback(async (): Promise<SMSBatchResult | null> => {
    if (selectedContacts.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Recipients Selected',
        message: 'Please select at least one contact before sending.',
      });
      return null;
    }

    if (!composerMessage.trim()) {
      showToast({
        type: 'warning',
        title: 'Empty Message',
        message: 'Please type an SMS message to transmit.',
      });
      return null;
    }

    try {
      setIsSending(true);
      setSendProgress(10);

      showToast({
        type: 'sending',
        title: 'Transmitting Messages',
        message: `Dispatching to ${selectedContacts.length} recipients...`,
      });

      const batchResult = await sendBulkSMS(
        selectedContacts,
        composerMessage,
        (progress) => setSendProgress(progress)
      );

      setCampaignHistory((prev) => [batchResult, ...prev]);

      // Persist to Supabase if configured
      if (isSupabaseConfigured()) {
        saveCampaignToSupabase(batchResult).catch((err) =>
          console.warn('Could not save campaign to Supabase:', err)
        );
      }

      setIsSending(false);
      setSendProgress(100);

      showToast({
        type: 'success',
        title: 'Campaign Delivered',
        message: `Successfully transmitted ${batchResult.totalSegments} SMS segments to ${batchResult.deliveredCount} contacts.`,
        duration: 6000,
      });

      return batchResult;
    } catch (err: unknown) {
      setIsSending(false);
      setSendProgress(0);
      const message = err instanceof Error ? err.message : String(err);
      showToast({
        type: 'error',
        title: 'Broadcast Failed',
        message,
        duration: 7000,
      });
      return null;
    }
  }, [selectedContacts, composerMessage, showToast]);

  const value: SMSContextType = {
    contacts,
    selectedContactIds,
    filters,
    isComposerOpen,
    composerMessage,
    isSending,
    sendProgress,
    toast,
    campaignHistory,
    activeTab,
    isLoadingContacts,
    isSupabaseLive,
    filteredContacts,
    selectedContacts,
    departments,
    stages,
    isAllFilteredSelected,
    isSomeFilteredSelected,
    setActiveTab,
    setContacts,
    addContacts,
    removeContact,
    clearAllContacts,
    toggleSelectContact,
    selectAllFiltered,
    deselectAll,
    setFilters,
    resetFilters,
    setIsComposerOpen,
    setComposerMessage,
    showToast,
    hideToast,
    triggerSendSMS,
    loadSampleData,
    refreshContacts,
  };

  return <SMSContext.Provider value={value}>{children}</SMSContext.Provider>;
};

export const useSMS = () => {
  const context = useContext(SMSContext);
  if (!context) {
    throw new Error('useSMS must be used within an SMSProvider');
  }
  return context;
};
