import { readJson, writeJson } from '../storage/index.js';
import { hashPassword } from '../auth/crypto.js';
import type { Workspace, User, KPIDefinition, KPIEntry, Transaction, ReconciliationState, AISuggestion } from '../../../shared/types/index.js';

export async function runSeed() {
  const isSeeded = await readJson<{ seeded: boolean }>('meta.json', { seeded: false });
  if (isSeeded.seeded) {
    return;
  }

  // 1. Workspaces
  const workspaces: Workspace[] = [
    { id: 'w_01', name: 'Main Street Bakery' },
    { id: 'w_02', name: 'Sunrise Accounting Firm' }
  ];
  await writeJson('workspaces.json', workspaces);

  // 2. Users
  const users: (User & { passwordHash: string })[] = [
    { id: 'u_01', name: 'Alice', role: 'Workspace Admin', workspaceId: 'w_01', passwordHash: await hashPassword('password123') },
    { id: 'u_02', name: 'Bob', role: 'Financial Manager', workspaceId: 'w_01', passwordHash: await hashPassword('password123') },
    { id: 'u_03', name: 'Carol', role: 'Client Portal User', workspaceId: 'w_02', passwordHash: await hashPassword('password123') },
    { id: 'u_04', name: 'Admin', role: 'superadmin', workspaceId: 'w_all', passwordHash: await hashPassword('password123') },
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
  const today = new Date('2023-11-01T00:00:00.000Z'); // Fixed date for determinism

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
        id: `kpi_entry_${def.id}_${i}`,
        kpiId: def.id,
        date: d.toISOString().split('T')[0],
        value: Number(val.toFixed(2)),
        isSynced: true,
        workspaceId: def.workspaceId
      });
    }
  });
  await writeJson('kpis.json', kpiEntries);

  // 5. Transactions
  const transactions: Transaction[] = [];
  for (let i = 0; i < 20; i++) {
    const isReconciled = i < 12;
    // Math.sin provides a deterministic pseudo-random value based on index
    const amount = 500 + Math.floor(Math.abs(Math.sin(i)) * 2000);
    const d = new Date(today);
    d.setDate(today.getDate() - (i % 30));
    transactions.push({
      id: `tx_${i}`,
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
    { id: 'rec_01', workspaceId: 'w_01', month: '2023-08', discrepanciesCount: 0, isDraft: false },
    { id: 'rec_02', workspaceId: 'w_01', month: '2023-09', discrepanciesCount: 0, isDraft: false },
    { id: 'rec_03', workspaceId: 'w_01', month: '2023-10', discrepanciesCount: 2, isDraft: true }
  ];
  await writeJson('reconciliations.json', recs);

  // 7. Suggestions
  const suggestions: AISuggestion[] = [
    { id: 'sug_01', workspaceId: 'w_01', type: 'trend_down', trigger: 'k_traffic', text: 'Alert: Declining trend in Daily Foot Traffic over last 3 days.', status: 'todo' },
    { id: 'sug_02', workspaceId: 'w_01', type: 'below_target', trigger: 'k_revenue', text: 'Alert: Daily Revenue is 20% below target.', status: 'todo' },
    { id: 'sug_03', workspaceId: 'w_01', type: 'unreconciled_count', trigger: 'transactions', text: 'Reconciliation needed: You have > 5 unreconciled transactions.', status: 'todo' },
    { id: 'sug_04', workspaceId: 'w_01', type: 'retention_risk', trigger: 'k_retention', text: 'Retention risk: Customer Return Rate below 40%.', status: 'todo' },
    { id: 'sug_05', workspaceId: 'w_01', type: 'positive_momentum', trigger: 'k_revenue', text: 'Positive momentum: Revenue up 10% week over week.', status: 'done' }
  ];
  await writeJson('suggestions.json', suggestions);

  // Mark seeded
  await writeJson('meta.json', { seeded: true });
}
