import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  Workspace,
  User,
  KPIDefinition,
  KPIEntry,
  Transaction,
  ReconciliationState,
  AISuggestion,
  Report,
  AuditLog,
  UserRole
} from '../src/shared/types';

// Simple async lock to prevent race conditions during file access
class AsyncLock {
  private promise: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentPromise = this.promise;
    this.promise = nextPromise;
    await currentPromise;
    return release!;
  }
}

const fileLock = new AsyncLock();
const DB_FILE = path.join(process.cwd(), 'data.json');

interface DatabaseSchema {
  workspaces: Workspace[];
  users: User[];
  kpiDefinitions: KPIDefinition[];
  kpiEntries: KPIEntry[];
  transactions: Transaction[];
  reconciliationStates: ReconciliationState[];
  aiSuggestions: AISuggestion[];
  reports: Report[];
  auditLogs: AuditLog[];
  meta: {
    seeded: boolean;
  };
}

const DEFAULT_DB: DatabaseSchema = {
  workspaces: [],
  users: [],
  kpiDefinitions: [],
  kpiEntries: [],
  transactions: [],
  reconciliationStates: [],
  aiSuggestions: [],
  reports: [],
  auditLogs: [],
  meta: {
    seeded: false
  }
};

// Password Hashing using PBKDF2 (Native, extremely reliable)
export function hashPassword(password: string, salt = 'quantify_salt_2026'): string {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return hash.toString('hex');
}

// Low-level safe database read
export async function readDB(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    // If file doesn't exist, return default database structure
    return { ...DEFAULT_DB };
  }
}

// Low-level safe database write with locking
export async function writeDB(data: DatabaseSchema): Promise<void> {
  const release = await fileLock.acquire();
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    release();
  }
}

// Database helper functions (Repository Pattern)
export const db = {
  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const data = await readDB();
    return data.workspaces;
  },
  async getWorkspaceById(id: string): Promise<Workspace | undefined> {
    const data = await readDB();
    return data.workspaces.find(w => w.id === id);
  },
  async createWorkspace(name: string): Promise<Workspace> {
    const data = await readDB();
    const workspace: Workspace = { 
      id: crypto.randomUUID(), 
      name,
      subscriptionPlan: 'free',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 day trial by default
    };
    data.workspaces.push(workspace);
    await writeDB(data);
    return workspace;
  },
  async updateWorkspaceSubscription(id: string, plan: 'free' | '6_months' | '1_year' | 'unsubscribed', expiresAt: string): Promise<Workspace | undefined> {
    const data = await readDB();
    const index = data.workspaces.findIndex(w => w.id === id);
    if (index === -1) return undefined;
    data.workspaces[index].subscriptionPlan = plan;
    data.workspaces[index].subscriptionExpiresAt = expiresAt;
    await writeDB(data);
    return data.workspaces[index];
  },
  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | undefined> {
    const data = await readDB();
    const index = data.workspaces.findIndex(w => w.id === id);
    if (index === -1) return undefined;
    data.workspaces[index] = { ...data.workspaces[index], ...updates };
    await writeDB(data);
    return data.workspaces[index];
  },

  // Users
  async getUsers(): Promise<User[]> {
    const data = await readDB();
    return data.users;
  },
  async getUserById(id: string): Promise<User | undefined> {
    const data = await readDB();
    return data.users.find(u => u.id === id);
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const data = await readDB();
    // In our app we use user name/email to identify them
    return data.users.find(u => u.name.toLowerCase() === email.toLowerCase());
  },
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const data = await readDB();
    const newUser: User = { ...user, id: crypto.randomUUID() };
    data.users.push(newUser);
    await writeDB(data);
    return newUser;
  },
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const data = await readDB();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    data.users[index] = { ...data.users[index], ...updates };
    await writeDB(data);
    return data.users[index];
  },

  // KPIs
  async getKPIs(workspaceId: string): Promise<KPIDefinition[]> {
    const data = await readDB();
    return data.kpiDefinitions.filter(k => k.workspaceId === workspaceId);
  },
  async getKPIById(id: string, workspaceId: string): Promise<KPIDefinition | undefined> {
    const data = await readDB();
    return data.kpiDefinitions.find(k => k.id === id && k.workspaceId === workspaceId);
  },
  async createKPI(kpi: Omit<KPIDefinition, 'id'>): Promise<KPIDefinition> {
    const data = await readDB();
    const newKPI: KPIDefinition = { ...kpi, id: crypto.randomUUID() };
    data.kpiDefinitions.push(newKPI);
    await writeDB(data);
    return newKPI;
  },
  async updateKPI(id: string, workspaceId: string, updates: Partial<Omit<KPIDefinition, 'id' | 'workspaceId'>>): Promise<KPIDefinition | undefined> {
    const data = await readDB();
    const index = data.kpiDefinitions.findIndex(k => k.id === id && k.workspaceId === workspaceId);
    if (index === -1) return undefined;
    data.kpiDefinitions[index] = { ...data.kpiDefinitions[index], ...updates };
    await writeDB(data);
    return data.kpiDefinitions[index];
  },
  async deleteKPI(id: string, workspaceId: string): Promise<boolean> {
    const data = await readDB();
    const initialLen = data.kpiDefinitions.length;
    data.kpiDefinitions = data.kpiDefinitions.filter(k => !(k.id === id && k.workspaceId === workspaceId));
    data.kpiEntries = data.kpiEntries.filter(e => !(e.kpiId === id && e.workspaceId === workspaceId));
    if (data.kpiDefinitions.length < initialLen) {
      await writeDB(data);
      return true;
    }
    return false;
  },

  // KPI Entries
  async getKPIEntries(workspaceId: string, kpiId?: string): Promise<KPIEntry[]> {
    const data = await readDB();
    let entries = data.kpiEntries.filter(e => e.workspaceId === workspaceId);
    if (kpiId) {
      entries = entries.filter(e => e.kpiId === kpiId);
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  },
  async createKPIEntry(entry: Omit<KPIEntry, 'id'>): Promise<KPIEntry> {
    const data = await readDB();
    // Check if entry for the same KPI on the same date already exists
    const existingIndex = data.kpiEntries.findIndex(
      e => e.kpiId === entry.kpiId && e.date === entry.date && e.workspaceId === entry.workspaceId
    );
    const newEntry: KPIEntry = { ...entry, id: crypto.randomUUID(), isSynced: true };
    if (existingIndex !== -1) {
      data.kpiEntries[existingIndex] = { ...data.kpiEntries[existingIndex], value: entry.value };
    } else {
      data.kpiEntries.push(newEntry);
    }
    await writeDB(data);
    return newEntry;
  },

  // Transactions
  async getTransactions(workspaceId: string): Promise<Transaction[]> {
    const data = await readDB();
    return data.transactions.filter(t => t.workspaceId === workspaceId).sort((a, b) => b.date.localeCompare(a.date));
  },
  async getTransactionById(id: string, workspaceId: string): Promise<Transaction | undefined> {
    const data = await readDB();
    return data.transactions.find(t => t.id === id && t.workspaceId === workspaceId);
  },
  async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const data = await readDB();
    const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
    data.transactions.push(newTx);
    await writeDB(data);
    return newTx;
  },
  async updateTransaction(id: string, workspaceId: string, updates: Partial<Omit<Transaction, 'id' | 'workspaceId'>>): Promise<Transaction | undefined> {
    const data = await readDB();
    const index = data.transactions.findIndex(t => t.id === id && t.workspaceId === workspaceId);
    if (index === -1) return undefined;
    data.transactions[index] = { ...data.transactions[index], ...updates };
    await writeDB(data);
    return data.transactions[index];
  },
  async deleteTransaction(id: string, workspaceId: string): Promise<boolean> {
    const data = await readDB();
    const initialLen = data.transactions.length;
    data.transactions = data.transactions.filter(t => !(t.id === id && t.workspaceId === workspaceId));
    if (data.transactions.length < initialLen) {
      await writeDB(data);
      return true;
    }
    return false;
  },

  // Reconciliation States
  async getReconciliationStates(workspaceId: string): Promise<ReconciliationState[]> {
    const data = await readDB();
    return data.reconciliationStates.filter(r => r.workspaceId === workspaceId);
  },
  async upsertReconciliationState(workspaceId: string, month: string, discrepanciesCount: number, isDraft: boolean): Promise<ReconciliationState> {
    const data = await readDB();
    const index = data.reconciliationStates.findIndex(r => r.workspaceId === workspaceId && r.month === month);
    let state: ReconciliationState;
    if (index !== -1) {
      data.reconciliationStates[index] = {
        ...data.reconciliationStates[index],
        discrepanciesCount,
        isDraft
      };
      state = data.reconciliationStates[index];
    } else {
      state = {
        id: crypto.randomUUID(),
        workspaceId,
        month,
        discrepanciesCount,
        isDraft
      };
      data.reconciliationStates.push(state);
    }
    await writeDB(data);
    return state;
  },

  // AI Suggestions
  async getAISuggestions(workspaceId: string): Promise<AISuggestion[]> {
    const data = await readDB();
    return data.aiSuggestions.filter(s => s.workspaceId === workspaceId);
  },
  async createAISuggestion(suggestion: Omit<AISuggestion, 'id'>): Promise<AISuggestion> {
    const data = await readDB();
    const newSuggestion: AISuggestion = { ...suggestion, id: crypto.randomUUID() };
    data.aiSuggestions.push(newSuggestion);
    await writeDB(data);
    return newSuggestion;
  },
  async updateAISuggestionStatus(id: string, workspaceId: string, status: 'todo' | 'done' | 'dismissed'): Promise<AISuggestion | undefined> {
    const data = await readDB();
    const index = data.aiSuggestions.findIndex(s => s.id === id && s.workspaceId === workspaceId);
    if (index === -1) return undefined;
    data.aiSuggestions[index].status = status;
    await writeDB(data);
    return data.aiSuggestions[index];
  },

  // Reports
  async getReports(workspaceId: string): Promise<Report[]> {
    const data = await readDB();
    return data.reports.filter(r => r.workspaceId === workspaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async createReport(workspaceId: string, title: string, content: string): Promise<Report> {
    const data = await readDB();
    const report: Report = {
      id: crypto.randomUUID(),
      workspaceId,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    data.reports.push(report);
    await writeDB(data);
    return report;
  },

  // Audit Logs
  async getAuditLogs(workspaceId?: string): Promise<AuditLog[]> {
    const data = await readDB();
    if (workspaceId) {
      // Find all users in this workspace to filter logs
      const wsUserIds = data.users.filter(u => u.workspaceId === workspaceId).map(u => u.id);
      return data.auditLogs.filter(log => wsUserIds.includes(log.userId)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    return data.auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async createAuditLog(userId: string, action: string, details: string): Promise<AuditLog> {
    const data = await readDB();
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    };
    data.auditLogs.push(log);
    await writeDB(data);
    return log;
  }
};

// Database seeding function
export async function seedDatabase(): Promise<void> {
  const data = await readDB();
  if (data.meta && data.meta.seeded) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding demo data into database...');

  // 1. Create Workspaces
  const w1Id = 'ws-acme-123';
  const w2Id = 'ws-beta-456';
  
  const workspaces: Workspace[] = [
    { 
      id: w1Id, 
      name: 'Acme Corp',
      subscriptionPlan: '1_year',
      subscriptionExpiresAt: '2027-07-15'
    },
    { 
      id: w2Id, 
      name: 'Beta Logistics',
      subscriptionPlan: '6_months',
      subscriptionExpiresAt: '2027-01-15'
    }
  ];

  // 2. Create Users
  const users: User[] = [
    {
      id: 'usr-admin',
      workspaceId: w1Id,
      name: 'admin@acme.com',
      role: 'Workspace Admin',
      password: hashPassword('admin123')
    },
    {
      id: 'usr-finance',
      workspaceId: w1Id,
      name: 'finance@acme.com',
      role: 'Financial Manager',
      password: hashPassword('finance123')
    },
    {
      id: 'usr-ops',
      workspaceId: w1Id,
      name: 'ops@acme.com',
      role: 'Operations Staff',
      password: hashPassword('ops123')
    },
    {
      id: 'usr-client',
      workspaceId: w1Id,
      name: 'client@acme.com',
      role: 'Client Portal User',
      password: hashPassword('client123')
    },
    {
      id: 'usr-superadmin',
      workspaceId: 'ws-superadmin-000', // Superadmin can view any or has special role
      name: 'superadmin@quantify.com',
      role: 'superadmin',
      password: hashPassword('superadmin123')
    }
  ];

  // 3. Create KPI Definitions
  const kpis: KPIDefinition[] = [
    {
      id: 'kpi-revenue',
      workspaceId: w1Id,
      name: 'Monthly Revenue',
      unit: '₹',
      targetValue: 500000
    },
    {
      id: 'kpi-cac',
      workspaceId: w1Id,
      name: 'Customer Acquisition Cost',
      unit: '₹',
      targetValue: 1500
    },
    {
      id: 'kpi-retention',
      workspaceId: w1Id,
      name: 'Customer Retention Rate',
      unit: '%',
      targetValue: 90
    }
  ];

  // 4. KPI Entries for Acme Corp (30 days of deterministic history)
  const entries: KPIEntry[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - i);
    const dateStr = entryDate.toISOString().split('T')[0];

    // Revenue: Starts high, but trends down in the last 4 days to trigger the downward trend warning
    let revValue = 480000 + Math.sin(i) * 20000;
    if (i <= 3) {
      // Last 4 days are declining: day 3 (450k), day 2 (430k), day 1 (410k), day 0 (390k)
      revValue = 450000 - (3 - i) * 20000;
    }

    // CAC: Generally around 1600
    const cacValue = 1600 + Math.cos(i) * 100;

    // Retention Rate: Drops below 40% in the last 3 days
    let retValue = 88 - (29 - i) * 0.5; // slow drift
    if (i <= 2) {
      retValue = 38 - i * 2; // drop to 34% - 38%
    }

    entries.push({
      id: `entry-rev-${dateStr}`,
      kpiId: 'kpi-revenue',
      workspaceId: w1Id,
      date: dateStr,
      value: Math.round(revValue),
      isSynced: true
    });

    entries.push({
      id: `entry-cac-${dateStr}`,
      kpiId: 'kpi-cac',
      workspaceId: w1Id,
      date: dateStr,
      value: Math.round(cacValue),
      isSynced: true
    });

    entries.push({
      id: `entry-ret-${dateStr}`,
      kpiId: 'kpi-retention',
      workspaceId: w1Id,
      date: dateStr,
      value: Math.round(retValue * 10) / 10,
      isSynced: true
    });
  }

  // 5. Transactions for Acme Corp (20 demo transactions, some unreconciled, totaling > ₹10,000 to trigger rules)
  const transactions: Transaction[] = [
    { id: 'tx-1', workspaceId: w1Id, date: '2026-07-01', amount: 45000, description: 'Client Retainer - Sunrise Tech', status: 'reconciled' },
    { id: 'tx-2', workspaceId: w1Id, date: '2026-07-02', amount: -2500, description: 'Office Internet Subscription', status: 'reconciled' },
    { id: 'tx-3', workspaceId: w1Id, date: '2026-07-03', amount: -15000, description: 'Desk chair purchases', status: 'unreconciled' }, // Unreconciled
    { id: 'tx-4', workspaceId: w1Id, date: '2026-07-04', amount: 80000, description: 'Software consulting project milestone', status: 'reconciled' },
    { id: 'tx-5', workspaceId: w1Id, date: '2026-07-05', amount: -3200, description: 'Team lunch expense', status: 'unreconciled' }, // Unreconciled
    { id: 'tx-6', workspaceId: w1Id, date: '2026-07-06', amount: -5000, description: 'Social Media Advertising campaign', status: 'unreconciled' }, // Unreconciled
    { id: 'tx-7', workspaceId: w1Id, date: '2026-07-07', amount: 120000, description: 'B2B Enterprise License - Nexus Group', status: 'reconciled' },
    { id: 'tx-8', workspaceId: w1Id, date: '2026-07-08', amount: -1200, description: 'Premium font licenses for branding', status: 'unreconciled' }, // Unreconciled
    { id: 'tx-9', workspaceId: w1Id, date: '2026-07-09', amount: -4000, description: 'Domain name renewal & VPS hosting', status: 'unreconciled' }, // Unreconciled
    { id: 'tx-10', workspaceId: w1Id, date: '2026-07-10', amount: -18000, description: 'Freelancer UI design contract', status: 'unreconciled' }, // Unreconciled (Total unreconciled: 15k+3.2k+5k+1.2k+4k+18k = 46.4k > 10,000 and count > 5!)
    { id: 'tx-11', workspaceId: w1Id, date: '2026-06-25', amount: 50000, description: 'Consulting invoice - Delta Co', status: 'reconciled' },
    { id: 'tx-12', workspaceId: w1Id, date: '2026-06-26', amount: -8500, description: 'Electricity and utility bills', status: 'reconciled' },
    { id: 'tx-13', workspaceId: w1Id, date: '2026-06-27', amount: -12000, description: 'Corporate taxation advisory fee', status: 'reconciled' },
    { id: 'tx-14', workspaceId: w1Id, date: '2026-06-28', amount: 150000, description: 'API licensing setup fee', status: 'reconciled' },
    { id: 'tx-15', workspaceId: w1Id, date: '2026-06-29', amount: -3500, description: 'SaaS subscription - Email Marketing', status: 'reconciled' },
    { id: 'tx-16', workspaceId: w1Id, date: '2026-06-30', amount: -45000, description: 'Office Space Monthly Rental', status: 'reconciled' },
    { id: 'tx-17', workspaceId: w1Id, date: '2026-06-15', amount: 95000, description: 'Enterprise License installment', status: 'reconciled' },
    { id: 'tx-18', workspaceId: w1Id, date: '2026-06-18', amount: -2400, description: 'Courier & logistics delivery charges', status: 'reconciled' },
    { id: 'tx-19', workspaceId: w1Id, date: '2026-06-20', amount: -10000, description: 'Hardware repair & system upgrade', status: 'reconciled' },
    { id: 'tx-20', workspaceId: w1Id, date: '2026-06-22', amount: 60000, description: 'Implementation support - Apex Systems', status: 'reconciled' }
  ];

  // 6. Reconciliation State for Acme Corp
  const reconciliations: ReconciliationState[] = [
    {
      id: 'rec-1',
      workspaceId: w1Id,
      month: '2026-06',
      discrepanciesCount: 0,
      isDraft: false
    },
    {
      id: 'rec-2',
      workspaceId: w1Id,
      month: '2026-07',
      discrepanciesCount: 6,
      isDraft: true
    }
  ];

  // 7. AI Suggestions for Acme Corp
  const suggestions: AISuggestion[] = [
    {
      id: 'sug-1',
      workspaceId: w1Id,
      type: 'revenue_decline',
      trigger: 'Revenue falling for 3+ consecutive entries',
      text: 'Monthly Revenue is showing a clear downward trend over the past 4 entries. We suggest reviewing active sales cycles and considering offering short-term discounts or promotional packaging to bolster top-line growth.',
      status: 'todo'
    },
    {
      id: 'sug-2',
      workspaceId: w1Id,
      type: 'retention_drop',
      trigger: 'Retention below 40%',
      text: 'Alert: Customer Retention Rate has crashed to 34%, which is significantly below your 90% target and critical limit of 40%. Reach out to recent churned customers or trigger high-priority feedback loops to fix onboarding friction.',
      status: 'todo'
    },
    {
      id: 'sug-3',
      workspaceId: w1Id,
      type: 'unreconciled_tx',
      trigger: 'More than 5 unreconciled transactions / total exceeds 10,000',
      text: 'Action required: You currently have 6 unreconciled transactions totaling ₹46,400. Keeping transactions reconciled ensures real-time accuracy in cash flow forecasts. Please head to the Reconciliation Workspace.',
      status: 'todo'
    }
  ];

  // 8. Audit Logs
  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: new Date(today.getTime() - 2 * 3600000).toISOString(),
      userId: 'usr-admin',
      action: 'USER_LOGIN',
      details: 'Administrator logged in from IP 192.168.1.45'
    },
    {
      id: 'log-2',
      timestamp: new Date(today.getTime() - 1 * 3600000).toISOString(),
      userId: 'usr-ops',
      action: 'KPI_ENTRY_CREATE',
      details: 'Entered value 34.2% for Customer Retention Rate on date 2026-07-10'
    }
  ];

  // Save seeded schema
  data.workspaces = workspaces;
  data.users = users;
  data.kpiDefinitions = kpis;
  data.kpiEntries = entries;
  data.transactions = transactions;
  data.reconciliationStates = reconciliations;
  data.aiSuggestions = suggestions;
  data.reports = [];
  data.auditLogs = auditLogs;
  data.meta = { seeded: true };

  await writeDB(data);
  console.log('Database successfully seeded!');
}
