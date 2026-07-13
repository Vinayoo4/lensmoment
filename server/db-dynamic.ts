import { isAppwriteEnabled } from './appwrite';
import { appwriteDb } from './appwrite-db';
import { db as localDb } from './db';

export const db: typeof localDb = {
  getWorkspaces: () => (isAppwriteEnabled ? appwriteDb : localDb).getWorkspaces(),
  getWorkspaceById: (id) => (isAppwriteEnabled ? appwriteDb : localDb).getWorkspaceById(id),
  createWorkspace: (name) => (isAppwriteEnabled ? appwriteDb : localDb).createWorkspace(name),
  updateWorkspace: (id, updates) => (isAppwriteEnabled ? appwriteDb : localDb).updateWorkspace(id, updates),
  updateWorkspaceSubscription: (id, plan, expiresAt) => (isAppwriteEnabled ? appwriteDb : localDb).updateWorkspaceSubscription(id, plan, expiresAt),

  getUsers: () => (isAppwriteEnabled ? appwriteDb : localDb).getUsers(),
  getUserByEmail: (email) => (isAppwriteEnabled ? appwriteDb : localDb).getUserByEmail(email),
  getUserById: (id) => (isAppwriteEnabled ? appwriteDb : localDb).getUserById(id),
  createUser: (user) => (isAppwriteEnabled ? appwriteDb : localDb).createUser(user),
  updateUser: (id, updates) => (isAppwriteEnabled ? appwriteDb : localDb).updateUser(id, updates),

  getKPIs: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getKPIs(workspaceId),
  getKPIById: (id, workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getKPIById(id, workspaceId),
  createKPI: (kpi) => (isAppwriteEnabled ? appwriteDb : localDb).createKPI(kpi),
  updateKPI: (id, workspaceId, updates) => (isAppwriteEnabled ? appwriteDb : localDb).updateKPI(id, workspaceId, updates),
  deleteKPI: (id, workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).deleteKPI(id, workspaceId),

  getKPIEntries: (workspaceId, kpiId) => (isAppwriteEnabled ? appwriteDb : localDb).getKPIEntries(workspaceId, kpiId),
  createKPIEntry: (entry) => (isAppwriteEnabled ? appwriteDb : localDb).createKPIEntry(entry),

  getTransactions: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getTransactions(workspaceId),
  getTransactionById: (id, workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getTransactionById(id, workspaceId),
  createTransaction: (tx) => (isAppwriteEnabled ? appwriteDb : localDb).createTransaction(tx),
  updateTransaction: (id, workspaceId, updates) => (isAppwriteEnabled ? appwriteDb : localDb).updateTransaction(id, workspaceId, updates),
  deleteTransaction: (id, workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).deleteTransaction(id, workspaceId),

  getReconciliationStates: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getReconciliationStates(workspaceId),
  upsertReconciliationState: (workspaceId, month, discrepanciesCount, isDraft) => (isAppwriteEnabled ? appwriteDb : localDb).upsertReconciliationState(workspaceId, month, discrepanciesCount, isDraft),

  getAISuggestions: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getAISuggestions(workspaceId),
  createAISuggestion: (sug) => (isAppwriteEnabled ? appwriteDb : localDb).createAISuggestion(sug),
  updateAISuggestionStatus: (id, workspaceId, status) => (isAppwriteEnabled ? appwriteDb : localDb).updateAISuggestionStatus(id, workspaceId, status),

  getReports: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getReports(workspaceId),
  createReport: (workspaceId, title, content) => (isAppwriteEnabled ? appwriteDb : localDb).createReport(workspaceId, title, content),

  getAuditLogs: (workspaceId) => (isAppwriteEnabled ? appwriteDb : localDb).getAuditLogs(workspaceId),
  createAuditLog: (userId, action, details) => (isAppwriteEnabled ? appwriteDb : localDb).createAuditLog(userId, action, details),
};
