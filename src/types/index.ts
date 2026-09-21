export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  department: string;
  stage: string;
  email?: string;
  createdAt: string;
}

export interface FilterState {
  searchQuery: string;
  department: string;
  stage: string;
}

export interface SMSTemplate {
  id: string;
  title: string;
  content: string;
  description: string;
}

export interface SMSBatchResult {
  batchId: string;
  status: 'delivered' | 'partially_delivered' | 'failed';
  recipientCount: number;
  totalSegments: number;
  deliveredCount: number;
  failedCount: number;
  messagePreview: string;
  sentAt: string;
  recipients: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    department: string;
    stage: string;
  }>;
  providerDetails: {
    providerName: string;
    latencyMs: number;
    simulated: boolean;
    endpointPlaceholder: string;
  };
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'sending';
  title: string;
  message?: string;
  timestamp?: number;
  duration?: number;
}
