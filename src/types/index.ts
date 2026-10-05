export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  department: string;
  stage: string;
  phoneNumber: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  createdAt?: string;
}

// Backwards compatibility alias for contacts
export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  department: string;
  stage: string;
  studentId?: string;
  email?: string;
  createdAt: string;
}

export type TargetingMode = 'selected' | 'department' | 'stage' | 'combined';

export interface FilterState {
  searchQuery: string;
  department: string;
  stage: string;
  carrier: string;
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
  gatewayUsed?: string;
  gateway_used?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'sending';
  title: string;
  message?: string;
  timestamp?: number;
  duration?: number;
}

export type DeliveryGateway = 'iraq_sms' | 'commpeak';

export interface AppSettings {
  defaultSenderId: string;
  defaultGateway: DeliveryGateway;
  iraqSmsApiKey: string;
  commpeakApiKey: string;
  iraqSmsApiUrl?: string;
  commpeakApiUrl?: string;
}
