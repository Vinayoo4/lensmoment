import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, appendJson, updateJson } from '../storage/index.js';
import type { KPIEntry, Transaction, AISuggestion, Workspace, KPIDefinition, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getDashboardData(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string || 'w_01';

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && user.workspaceId !== workspaceId) {
    workspaceId = user.workspaceId;
  }

  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const suggestions = await readJson<AISuggestion[]>('suggestions.json', []);

  res.json({
    kpis: kpis.filter(k => k.workspaceId === workspaceId),
    transactions: transactions.filter(t => t.workspaceId === workspaceId),
    suggestions: suggestions.filter(s => s.workspaceId === workspaceId && s.status === 'todo'),
  });
}

export async function createKpi(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const { kpiId, date, value, isSynced } = req.body;
  let { workspaceId } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const newKpi: KPIEntry = {
    id: uuidv4(),
    kpiId,
    date,
    value: Number(value),
    isSynced: isSynced !== false,
    workspaceId
  };

  await appendJson<KPIEntry>('kpis.json', newKpi);
  await runQuantifyEngine(newKpi.workspaceId || 'w_01');

  res.status(201).json(newKpi);
}

export async function createTransaction(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const { date, amount, description, status } = req.body;
  let { workspaceId } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const newTransaction: Transaction = {
    id: uuidv4(),
    workspaceId: workspaceId || 'w_01',
    date,
    amount: Number(amount),
    description,
    status: status || 'unreconciled',
  };

  await appendJson<Transaction>('transactions.json', newTransaction);
  await runQuantifyEngine(newTransaction.workspaceId || 'w_01');

  res.status(201).json(newTransaction);
}

export async function updateTransactionStatus(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const { id } = req.params;
  const { status } = req.body;

  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const tx = transactions.find(t => t.id === id);

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && tx.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await updateJson<Transaction>('transactions.json', id as string, { status });
  await runQuantifyEngine(tx.workspaceId || 'w_01');

  res.json({ success: true });
}

export async function runQuantifyEngine(workspaceId: string) {
  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const existingSuggestions = await readJson<AISuggestion[]>('suggestions.json', []);
  const kpiDefs = await readJson<KPIDefinition[]>('kpi_defs.json', []);

  const newSuggestions: AISuggestion[] = [];

  const addSuggestion = (type: string, trigger: string, text: string) => {
    const isDuplicate = existingSuggestions.some(s => s.workspaceId === workspaceId && s.type === type && s.trigger === trigger && s.status !== 'dismissed');
    if (!isDuplicate && !newSuggestions.some(s => s.type === type && s.trigger === trigger)) {
      newSuggestions.push({
        id: uuidv4(),
        workspaceId,
        type,
        trigger,
        text,
        status: 'todo'
      });
    }
  };

  const workspaceKpis = kpis.filter(k => k.workspaceId === workspaceId || !k.kpiId);

  const kpisByDef = workspaceKpis.reduce((acc, kpi) => {
    if (!acc[kpi.kpiId]) acc[kpi.kpiId] = [];
    acc[kpi.kpiId].push(kpi);
    return acc;
  }, {} as Record<string, KPIEntry[]>);

  let currentRevenue = 0;
  let previousRevenue = 0;

  for (const [kpiId, entries] of Object.entries(kpisByDef)) {
    if (!entries) continue;
    const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Rule: KPI trend down 3+ consecutive days
    if (sorted.length >= 4) {
      const last4 = sorted.slice(-4);
      if (last4[0].value > last4[1].value && last4[1].value > last4[2].value && last4[2].value > last4[3].value) {
        const def = kpiDefs.find(d => d.id === kpiId);
        addSuggestion('trend_down', kpiId, `Alert: Declining trend in ${def?.name || kpiId} over 3+ days.`);
      }
    }

    const def = kpiDefs.find(d => d.id === kpiId);

    // Rule: KPI value below target by 20%+
    if (def && (def as KPIDefinition & { targetValue?: number }).targetValue && sorted.length > 0) {
      const latest = sorted[sorted.length - 1];
      if (latest.value < ((def as KPIDefinition & { targetValue?: number }).targetValue! * 0.8)) {
        addSuggestion('below_target', kpiId, `Alert: ${def.name} is below target by 20% or more.`);
      }
    } else if (def && def.id === 'k_revenue' && sorted.length > 0) {
        const latest = sorted[sorted.length - 1];
        if (latest.value < (5000 * 0.8)) {
            addSuggestion('below_target', kpiId, `Alert: Daily Revenue is below target by 20% or more.`);
        }
    }

    // Rule: Customer Return Rate below 40%
    if (kpiId === 'k_retention' && sorted.length > 0) {
      const latest = sorted[sorted.length - 1];
      if (latest.value < 40) {
        addSuggestion('retention_risk', kpiId, `Retention risk: Customer Return Rate below 40%.`);
      }
    }

    // Capture Revenue for WoA Calculation
    if (kpiId === 'k_revenue' && sorted.length >= 14) {
      currentRevenue = sorted.slice(-7).reduce((sum, e) => sum + e.value, 0);
      previousRevenue = sorted.slice(-14, -7).reduce((sum, e) => sum + e.value, 0);
    }
  }

  // Rule: Revenue up 10%+ week over week
  if (previousRevenue > 0) {
    const growth = (currentRevenue - previousRevenue) / previousRevenue;
    if (growth >= 0.10) {
      addSuggestion('positive_momentum', 'k_revenue', `Positive momentum: Revenue up ${(growth*100).toFixed(0)}% week over week.`);
    }
  }

  // Accounting rules
  const unreconciledTx = transactions.filter(t => t.workspaceId === workspaceId && t.status === 'unreconciled');

  // Rule: Unreconciled transactions > 5
  if (unreconciledTx.length > 5) {
    addSuggestion('reconciliation_needed', 'transactions', `Reconciliation needed: You have ${unreconciledTx.length} unreconciled transactions.`);
  }

  // Rule: Unreconciled amount > ₹10,000
  const unreconciledAmount = unreconciledTx.reduce((sum, t) => sum + t.amount, 0);
  if (unreconciledAmount > 10000) {
    addSuggestion('large_reconciliation_gap', 'unreconciled_amount', `Large reconciliation gap: You have unassigned transaction gaps totaling ₹${unreconciledAmount}.`);
  }

  if (newSuggestions.length > 0) {
      await writeJson('suggestions.json', [...existingSuggestions, ...newSuggestions]);
  }
}
