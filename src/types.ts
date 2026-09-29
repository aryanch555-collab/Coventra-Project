export type UserRole = 'manager' | 'agent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  lastActiveAt?: string;
}

export type CallOutcome =
  | 'Interested / Lead Qualified'
  | 'Follow Up / Callback'
  | 'Meeting Scheduled'
  | 'Not Interested'
  | 'Wrong Number / Disconnected'
  | 'No Answer / Voicemail'
  | 'Busy / Call Later'
  | 'Gatekeeper Refusal';

export type LeadStatus = 'unassigned' | 'in_progress' | 'completed';

export interface LeadRecord {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetType?: 'production' | 'sample_test';
  rowNumber: number;
  // Core contact info
  fullName: string;
  phoneNumber: string;
  company?: string;
  title?: string;
  email?: string;
  location?: string;
  industry?: string;
  estimatedRevenue?: string;
  notes?: string;
  // Dynamic extra fields parsed from CSV
  extraFields?: Record<string, string>;
  
  // Processing status
  status: LeadStatus;
  claimedByUid?: string;
  claimedByName?: string;
  claimedAt?: string;
  
  // Outcome details once processed
  outcome?: CallOutcome;
  outcomeNotes?: string;
  processedAt?: string;
  processedByUid?: string;
  processedByName?: string;
  
  createdAt: string;
}

export interface Dataset {
  id: string;
  name: string;
  datasetType?: 'production' | 'sample_test';
  uploadedAt: string;
  uploadedByUid: string;
  uploadedByName: string;
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  columns: string[];
  status: 'active' | 'archived';
}


export interface CallLog {
  id: string;
  leadId: string;
  datasetId: string;
  datasetName: string;
  agentUid: string;
  agentName: string;
  agentEmail: string;
  phoneNumber: string;
  leadName: string;
  company?: string;
  outcome: CallOutcome;
  outcomeNotes?: string;
  followUpDate?: string;
  callDurationSeconds?: number;
  timestamp: string;
}

export interface UserAccount {
  uid?: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

