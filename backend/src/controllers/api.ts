import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, appendJson, updateJson } from '../storage/index.js';
import type { KPIEntry, Transaction, AISuggestion, Workspace } from '../../../shared/types/index.js';

export async function getDashboardData(req: Request, res: Response) {
  const workspaceId = req.query.workspaceId as string || 'w_01'; // Defaulting for simple MVP

  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const suggestions = await readJson<AISuggestion[]>('suggestions.json', []);

  res.json({
    kpis: kpis,
    transactions: transactions,
    suggestions: suggestions.filter(s => s.workspaceId === workspaceId && s.status === 'todo'),
  });
}

export async function createKpi(req: Request, res: Response) {
  const { kpiId, date, value, isSynced, workspaceId } = req.body;
  const newKpi: KPIEntry = {
    id: uuidv4(),
    kpiId,
    date,
    value: Number(value),
    isSynced: isSynced !== false,
  };

  await appendJson<KPIEntry>('kpis.json', newKpi);
  await runQuantifyEngine(workspaceId || 'w_01');

  res.status(201).json(newKpi);
}

export async function createTransaction(req: Request, res: Response) {
  const { workspaceId, date, amount, description, status } = req.body;
  const newTransaction: Transaction = {
    id: uuidv4(),
    workspaceId: workspaceId || 'w_01',
    date,
    amount: Number(amount),
    description,
    status: status || 'unreconciled',
  };

  await appendJson<Transaction>('transactions.json', newTransaction);
  await runQuantifyEngine(workspaceId || 'w_01');

  res.status(201).json(newTransaction);
}

export async function updateTransactionStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  await updateJson<Transaction>('transactions.json', id as string, { status });
  await runQuantifyEngine('w_01'); // Simple trigger
  res.json({ success: true });
}

// The internal Rule Engine logic
export async function runQuantifyEngine(workspaceId: string) {
  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);

  const suggestions: AISuggestion[] = [];

  // Group KPIs
  const kpisByDef = kpis.reduce((acc, kpi) => {
    if (!acc[kpi.kpiId]) acc[kpi.kpiId] = [];
    acc[kpi.kpiId].push(kpi);
    return acc;
  }, {} as Record<string, KPIEntry[]>);

  for (const [kpiId, entries] of Object.entries(kpisByDef)) {
    if (!entries) continue;
    // Sort by date (assuming date strings sort correctly)
    const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const recent = sorted.slice(-2);
    if (recent.length === 2 && recent[1] && recent[0] && recent[1].value < recent[0].value) {
      suggestions.push({
        id: uuidv4(),
        workspaceId,
        type: 'trend_down',
        trigger: 'traffic_drop',
        text: `Alert: KPI dropped from ${recent[0].value} to ${recent[1].value}.`,
        status: 'todo'
      });
    }
  }

  // Accounting discrepancy rule
  const unreconciledAmount = transactions
    .filter(t => t.workspaceId === workspaceId && t.status === 'unreconciled')
    .reduce((sum, t) => sum + t.amount, 0);

  if (unreconciledAmount !== 0) {
    suggestions.push({
      id: uuidv4(),
      workspaceId,
      type: 'accounting_gap',
      trigger: 'unreconciled',
      text: `Reconciliation warning: You have unassigned transaction gaps totaling $${unreconciledAmount}.`,
      status: 'todo'
    });
  }

  // Replace existing suggestions with new ones for simplicity
  await writeJson('suggestions.json', suggestions);
}