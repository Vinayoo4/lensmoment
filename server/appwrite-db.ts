import { ID, Query, Databases, AppwriteException } from 'node-appwrite';
import { databases, APPWRITE_DB_ID, COLLECTIONS } from './appwrite';
import {
  Workspace,
  User,
  KPIDefinition,
  KPIEntry,
  Transaction,
  ReconciliationState,
  AISuggestion,
  Report,
  AuditLog
} from '../src/shared/types';
import crypto from 'crypto';

// Mapping local IDs to Appwrite document IDs requires a clean ID since Appwrite has constraints
// Appwrite doc IDs can only contain [a-zA-Z0-9.-_] and max 36 chars.
function cleanId(id: string) {
  return id.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 36);
}

// Helper to remove Appwrite specific fields
function stripAppwriteMetadata<T>(doc: any): T {
  if (!doc) return doc;
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = doc;
  return rest as unknown as T;
}

export const appwriteDb = {
  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.workspaces);
    return res.documents.map(d => stripAppwriteMetadata<Workspace>(d));
  },
  async getWorkspaceById(id: string): Promise<Workspace | null> {
    try {
      const res = await databases.getDocument(APPWRITE_DB_ID, COLLECTIONS.workspaces, cleanId(id));
      return stripAppwriteMetadata<Workspace>(res);
    } catch (e: any) { if (e.code === 404) return null; throw e; }
  },
  async createWorkspace(name: string): Promise<Workspace> {
    const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
    const ws: Workspace = { id, name };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.workspaces, cleanId(id), ws);
    return ws;
  },
  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    try {
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.workspaces, cleanId(id), updates);
      return stripAppwriteMetadata<Workspace>(res);
    } catch (e: any) { if (e.code === 404) return null; throw e; }
  },
  async updateWorkspaceSubscription(id: string, plan: Workspace['subscriptionPlan'], expiresAt: string): Promise<Workspace | null> {
    return this.updateWorkspace(id, { subscriptionPlan: plan, subscriptionExpiresAt: expiresAt });
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.users);
    return res.documents.map(d => stripAppwriteMetadata<User>(d));
  },
  async getUserByEmail(email: string): Promise<User | null> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.users, [Query.equal('name', email)]);
    if (res.documents.length === 0) return null;
    return stripAppwriteMetadata<User>(res.documents[0]);
  },
  async getUserById(id: string): Promise<User | null> {
    try {
      const res = await databases.getDocument(APPWRITE_DB_ID, COLLECTIONS.users, cleanId(id));
      return stripAppwriteMetadata<User>(res);
    } catch (e: any) { if (e.code === 404) return null; throw e; }
  },
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const newUser: User = { ...user, id };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.users, cleanId(id), newUser);
    return newUser;
  },
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const cleanUpdates: any = { ...updates };
      // Nested objects might be problematic in Appwrite without proper schema, so we stringify if needed, or assume flat schema
      // For simplicity in this mock, we assume JSON parsing or flat string for notificationPreferences.
      if (cleanUpdates.notificationPreferences) {
         cleanUpdates.notificationPreferences = JSON.stringify(cleanUpdates.notificationPreferences);
      }
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.users, cleanId(id), cleanUpdates);
      const user = stripAppwriteMetadata<User>(res);
      if (typeof user.notificationPreferences === 'string') {
        try { user.notificationPreferences = JSON.parse(user.notificationPreferences as string); } catch(e){}
      }
      return user;
    } catch (e: any) { if (e.code === 404) return null; throw e; }
  },

  // KPIs
  async getKPIs(workspaceId: string): Promise<KPIDefinition[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, [Query.equal('workspaceId', workspaceId)]);
    return res.documents.map(d => stripAppwriteMetadata<KPIDefinition>(d));
  },
  async getKPIById(id: string, workspaceId: string): Promise<KPIDefinition | undefined> {
    try {
      const res = await databases.getDocument(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, cleanId(id));
      const kpi = stripAppwriteMetadata<KPIDefinition>(res);
      if (kpi.workspaceId !== workspaceId) return undefined;
      return kpi;
    } catch (e: any) { if (e.code === 404) return undefined; throw e; }
  },
  async createKPI(kpi: Omit<KPIDefinition, 'id'>): Promise<KPIDefinition> {
    const id = `kpi-${crypto.randomUUID().slice(0, 8)}`;
    const newKpi: KPIDefinition = { ...kpi, id };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, cleanId(id), newKpi);
    return newKpi;
  },
  async updateKPI(id: string, workspaceId: string, updates: Partial<Omit<KPIDefinition, 'id' | 'workspaceId'>>): Promise<KPIDefinition | undefined> {
    try {
      const kpi = await this.getKPIById(id, workspaceId);
      if (!kpi) return undefined;
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, cleanId(id), updates);
      return stripAppwriteMetadata<KPIDefinition>(res);
    } catch (e: any) { if (e.code === 404) return undefined; throw e; }
  },
  async deleteKPI(id: string, workspaceId: string): Promise<boolean> {
    try {
      const kpi = await this.getKPIById(id, workspaceId);
      if (!kpi) return false;
      await databases.deleteDocument(APPWRITE_DB_ID, COLLECTIONS.kpiDefinitions, cleanId(id));
      // Also delete entries
      const entries = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.kpiEntries, [Query.equal('kpiId', id)]);
      for (const entry of entries.documents) {
        await databases.deleteDocument(APPWRITE_DB_ID, COLLECTIONS.kpiEntries, entry.$id);
      }
      return true;
    } catch (e: any) { if (e.code === 404) return false; throw e; }
  },

  // KPI Entries
  async getKPIEntries(workspaceId: string, kpiId?: string): Promise<KPIEntry[]> {
    const queries = [Query.equal('workspaceId', workspaceId), Query.limit(500)];
    if (kpiId) queries.push(Query.equal('kpiId', kpiId));
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.kpiEntries, queries);
    return res.documents.map(d => stripAppwriteMetadata<KPIEntry>(d)).sort((a,b) => a.date.localeCompare(b.date));
  },
  async createKPIEntry(entry: Omit<KPIEntry, 'id'>): Promise<KPIEntry> {
    const id = `ent-${crypto.randomUUID().slice(0, 8)}`;
    const newEntry: KPIEntry = { ...entry, id, isSynced: true };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.kpiEntries, cleanId(id), newEntry);
    return newEntry;
  },

  // Transactions
  async getTransactions(workspaceId: string): Promise<Transaction[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.transactions, [Query.equal('workspaceId', workspaceId), Query.limit(1000)]);
    return res.documents.map(d => stripAppwriteMetadata<Transaction>(d)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  async getTransactionById(id: string, workspaceId: string): Promise<Transaction | undefined> {
    try {
      const res = await databases.getDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, cleanId(id));
      const tx = stripAppwriteMetadata<Transaction>(res);
      if (tx.workspaceId !== workspaceId) return undefined;
      return tx;
    } catch (e: any) { if (e.code === 404) return undefined; throw e; }
  },
  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = `tx-${crypto.randomUUID().slice(0, 8)}`;
    const newTx: Transaction = { ...tx, id };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, cleanId(id), newTx);
    return newTx;
  },
  async updateTransaction(id: string, workspaceId: string, updates: Partial<Omit<Transaction, 'id' | 'workspaceId'>>): Promise<Transaction | undefined> {
    try {
      const tx = await this.getTransactionById(id, workspaceId);
      if (!tx) return undefined;
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, cleanId(id), updates);
      return stripAppwriteMetadata<Transaction>(res);
    } catch (e: any) { if (e.code === 404) return undefined; throw e; }
  },
  async deleteTransaction(id: string, workspaceId: string): Promise<boolean> {
    try {
      const tx = await this.getTransactionById(id, workspaceId);
      if (!tx) return false;
      await databases.deleteDocument(APPWRITE_DB_ID, COLLECTIONS.transactions, cleanId(id));
      return true;
    } catch (e: any) { if (e.code === 404) return false; throw e; }
  },

  // Reconciliation
  async getReconciliationStates(workspaceId: string): Promise<ReconciliationState[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.reconciliationStates, [Query.equal('workspaceId', workspaceId)]);
    return res.documents.map(d => stripAppwriteMetadata<ReconciliationState>(d)).sort((a,b) => b.month.localeCompare(a.month));
  },
  async upsertReconciliationState(workspaceId: string, month: string, discrepanciesCount: number, isDraft: boolean): Promise<ReconciliationState> {
    const existing = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.reconciliationStates, [
      Query.equal('workspaceId', workspaceId),
      Query.equal('month', month)
    ]);
    const state = { workspaceId, month, discrepanciesCount, isDraft };
    if (existing.documents.length > 0) {
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.reconciliationStates, existing.documents[0].$id, state);
      return stripAppwriteMetadata<ReconciliationState>(res);
    }
    const id = `rec-${crypto.randomUUID().slice(0, 8)}`;
    const newState: ReconciliationState = { ...state, id };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.reconciliationStates, cleanId(id), newState);
    return newState;
  },

  // AI Suggestions
  async getAISuggestions(workspaceId: string): Promise<AISuggestion[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.aiSuggestions, [Query.equal('workspaceId', workspaceId)]);
    return res.documents.map(d => stripAppwriteMetadata<AISuggestion>(d));
  },
  async createAISuggestion(suggestion: Omit<AISuggestion, 'id'>): Promise<AISuggestion> {
    const id = `sug-${crypto.randomUUID().slice(0, 8)}`;
    const newSug: AISuggestion = { ...suggestion, id };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.aiSuggestions, cleanId(id), newSug);
    return newSug;
  },
  async updateAISuggestionStatus(id: string, workspaceId: string, status: 'todo' | 'done' | 'dismissed'): Promise<AISuggestion | undefined> {
    try {
      const suggestionRes = await databases.getDocument(APPWRITE_DB_ID, COLLECTIONS.aiSuggestions, cleanId(id));
      if (suggestionRes.workspaceId !== workspaceId) return undefined;
      const res = await databases.updateDocument(APPWRITE_DB_ID, COLLECTIONS.aiSuggestions, cleanId(id), { status });
      return stripAppwriteMetadata<AISuggestion>(res);
    } catch (e: any) { if (e.code === 404) return undefined; throw e; }
  },

  // Reports
  async getReports(workspaceId: string): Promise<Report[]> {
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.reports, [Query.equal('workspaceId', workspaceId)]);
    return res.documents.map(d => stripAppwriteMetadata<Report>(d)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async createReport(workspaceId: string, title: string, content: string): Promise<Report> {
    const id = `rep-${crypto.randomUUID().slice(0, 8)}`;
    const newRep: Report = { id, workspaceId, title, content, createdAt: new Date().toISOString() };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.reports, cleanId(id), newRep);
    return newRep;
  },

  // Audit Logs
  async getAuditLogs(workspaceId?: string): Promise<AuditLog[]> {
    if (workspaceId) {
      // Find users in workspace first (Appwrite queries are limited with joins)
      const users = await this.getUsers();
      const wsUserIds = users.filter(u => u.workspaceId === workspaceId).map(u => u.id);
      if (wsUserIds.length === 0) return [];

      // Batch queries or fetch all and filter since userIds might be large
      const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.auditLogs, [Query.limit(1000)]);
      return res.documents
        .map(d => stripAppwriteMetadata<AuditLog>(d))
        .filter(log => wsUserIds.includes(log.userId))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTIONS.auditLogs, [Query.limit(1000)]);
    return res.documents
      .map(d => stripAppwriteMetadata<AuditLog>(d))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async createAuditLog(userId: string, action: string, details: string): Promise<AuditLog> {
    const id = `log-${crypto.randomUUID().slice(0, 8)}`;
    const log: AuditLog = { id, timestamp: new Date().toISOString(), userId, action, details };
    await databases.createDocument(APPWRITE_DB_ID, COLLECTIONS.auditLogs, cleanId(id), log);
    return log;
  }
};
