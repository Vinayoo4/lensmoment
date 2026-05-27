export interface Workspace {
  id: string;
  name: string;
  firmId?: string;
}

export type Role = 'Workspace Admin' | 'Financial Manager' | 'Operations Staff' | 'Client Portal User';

export interface User {
  id: string;
  workspaceId: string;
  role: Role;
  name: string;
}

export interface KPIDefinition {
  id: string;
  workspaceId: string;
  name: string;
  unit: string;
}

export interface KPIEntry {
  id: string;
  kpiId: string;
  date: string;
  value: number;
  isSynced: boolean;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  date: string;
  amount: number;
  description: string;
  status: 'reconciled' | 'unreconciled';
}

export interface ReconciliationState {
  id: string;
  workspaceId: string;
  month: string;
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

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details?: any;
}
