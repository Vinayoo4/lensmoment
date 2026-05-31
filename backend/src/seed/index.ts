import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../storage/index.js';
import { hashPassword } from '../auth/crypto.js';
import type { Workspace, User, KPIDefinition, KPIEntry, Transaction, ReconciliationState, AISuggestion } from '../../../shared/types/index.js';

export async function runSeed() {
  const isSeeded = await readJson<{ seeded: boolean }>('meta.json', { seeded: false });
  if (isSeeded.seeded) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  // 1. Workspaces
  const workspaces: Workspace[] = [
    { id: 'w_01', name: 'Main Street Bakery' },
    { id: 'w_02', name: 'Sunrise Accounting Firm' }
  ];
  await writeJson('workspaces.json', workspaces);

  // 2. Users
  const users: User[] = [
    { id: uuidv4(), name: 'Alice', role: 'Workspace Admin', workspaceId: 'w_01', passwordHash: hashPassword('password123') } as any,
    { id: uuidv4(), name: 'Bob', role: 'Financial Manager', workspaceId: 'w_01', passwordHash: hashPassword('password123') } as any,
    { id: uuidv4(), name: 'Carol', role: 'Client Portal User', workspaceId: 'w_02', passwordHash: hashPassword('password123') } as any,
    { id: uuidv4(), name: 'Admin', role: 'superadmin', workspaceId: 'w_all', passwordHash: hashPassword('password123') } as any,
  ];
  await writeJson('users.json', users);

  // 3. KPI Definitions
  const kpiDefs: KPIDefinition[] = [
    { id: 'k_traffic', workspaceId: 'w_01', name: 'Daily Foot Traffic', unit: 'count' },
    { id: 'k_revenue', workspaceId: 'w_01', name: 'Daily Revenue', unit: 'INR' },
    { id: 'k_atv', workspaceId: 'w_01', name: 'Average Transaction Value', unit: 'INR' },
    { id: 'k_retention', workspaceId: 'w_01', name: 'Customer Return Rate', unit: '%' },
    { id: 'k_inventory', workspaceId: 'w_01', name: 'Inventory Turnover', unit: 'count' }
  ];
  await writeJson('kpi_defs.json', kpiDefs);

  // 4. KPI Entries
  const kpiEntries: KPIEntry[] = [];
  const today = new Date();

  kpiDefs.forEach(def => {
    let baseVal = 100;
    if (def.id === 'k_revenue') baseVal = 5000;
    if (def.id === 'k_atv') baseVal = 50;
    if (def.id === 'k_retention') baseVal = 60;
    if (def.id === 'k_inventory') baseVal = 10;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      // Simulate some trend, let's say traffic dropping for last 3 days
      let val = baseVal + Math.floor(Math.random() * (baseVal * 0.2)) - (baseVal * 0.1);
      if (def.id === 'k_traffic' && i < 3) val -= (3 - i) * 15;

      kpiEntries.push({
        id: uuidv4(),
        kpiId: def.id,
        date: d.toISOString().split('T')[0],
        value: Number(val.toFixed(2)),
        isSynced: true,
        workspaceId: def.workspaceId
      } as any);
    }
  });
  await writeJson('kpis.json', kpiEntries);

  // 5. Transactions
  const transactions: Transaction[] = [];
  for (let i = 0; i < 20; i++) {
    const isReconciled = i < 12;
    const amount = 500 + Math.floor(Math.random() * 2000);
    const d = new Date(today);
    d.setDate(today.getDate() - (i % 30));
    transactions.push({
      id: uuidv4(),
      workspaceId: 'w_01',
      date: d.toISOString().split('T')[0],
      amount: amount,
      description: `Transaction ${i + 1}`,
      status: isReconciled ? 'reconciled' : 'unreconciled'
    });
  }
  await writeJson('transactions.json', transactions);

  // 6. Reconciliation State
  const recs: ReconciliationState[] = [
    { id: uuidv4(), workspaceId: 'w_01', month: '2023-08', discrepanciesCount: 0, isDraft: false },
    { id: uuidv4(), workspaceId: 'w_01', month: '2023-09', discrepanciesCount: 0, isDraft: false },
    { id: uuidv4(), workspaceId: 'w_01', month: '2023-10', discrepanciesCount: 2, isDraft: true }
  ];
  await writeJson('reconciliations.json', recs);

  // 7. Suggestions
  const suggestions: AISuggestion[] = [
    { id: uuidv4(), workspaceId: 'w_01', type: 'trend_down', trigger: 'k_traffic', text: 'Alert: Declining trend in Daily Foot Traffic over last 3 days.', status: 'todo' },
    { id: uuidv4(), workspaceId: 'w_01', type: 'below_target', trigger: 'k_revenue', text: 'Alert: Daily Revenue is 20% below target.', status: 'todo' },
    { id: uuidv4(), workspaceId: 'w_01', type: 'unreconciled_count', trigger: 'transactions', text: 'Reconciliation needed: You have > 5 unreconciled transactions.', status: 'todo' },
    { id: uuidv4(), workspaceId: 'w_01', type: 'retention_risk', trigger: 'k_retention', text: 'Retention risk: Customer Return Rate below 40%.', status: 'todo' },
    { id: uuidv4(), workspaceId: 'w_01', type: 'positive_momentum', trigger: 'k_revenue', text: 'Positive momentum: Revenue up 10% week over week.', status: 'done' }
  ];
  await writeJson('suggestions.json', suggestions);

  // Mark seeded
  await writeJson('meta.json', { seeded: true });
  console.log('Seeding complete.');
}
