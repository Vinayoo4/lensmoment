/**
 * Shared Type Definitions for Quantify AI
 */

export type UserRole = 
  | 'Workspace Admin'
  | 'Financial Manager'
  | 'Operations Staff'
  | 'Client Portal User'
  | 'superadmin';

export interface Workspace {
  id: string;
  name: string;
  subscriptionPlan?: 'free' | '6_months' | '1_year' | 'unsubscribed';
  subscriptionExpiresAt?: string; // YYYY-MM-DD
}

export interface User {
  id: string;
  workspaceId: string;
  role: UserRole;
  name: string; // usually login email/name
  displayName?: string;
  email?: string;
  password?: string; // only used during registration/login transfer (never exposed in GET endpoints)
  notificationPreferences?: {
    emailBreaches: boolean;
    emailDigest: boolean;
    pushAnomalies: boolean;
    marketing: boolean;
  };
}

export interface KPIDefinition {
  id: string;
  workspaceId: string;
  name: string;
  unit: string;
  targetValue?: number;
}

export interface KPIEntry {
  id: string;
  kpiId: string;
  workspaceId: string;
  date: string; // YYYY-MM-DD
  value: number;
  isSynced?: boolean;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  status: 'reconciled' | 'unreconciled';
}

export interface ReconciliationState {
  id: string;
  workspaceId: string;
  month: string; // YYYY-MM
  discrepanciesCount: number;
  isDraft: boolean;
}

export interface AISuggestion {
  id: string;
  workspaceId: string;
  type: string;
  trigger: string;
  text: string;
  status: 'todo' | 'done' | 'dismissed';
}

export interface Report {
  id: string;
  workspaceId: string;
  title: string;
  content: string; // markdown content
  createdAt: string; // ISO timestamp
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO timestamp
  userId: string;
  action: string;
  details: string;
}

// Offline Action Queue
export interface OfflineAction {
  id: string;
  type: 'create_kpi_entry' | 'create_transaction' | 'update_transaction_status' | 'save_reconciliation';
  payload: any;
  timestamp: number;
  duplicateHash: string;
  isFailed?: boolean;
  errorMessage?: string;
}
