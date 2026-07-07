import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, appendJson } from '../storage/index.js';
import type { Workspace, KPIEntry, Transaction, AISuggestion } from '../../../shared/types/index.js';

export async function getWorkspaces(req: Request, res: Response) {
  const workspaces = await readJson<Workspace[]>('workspaces.json', []);
  // Assuming a user can see all for MVP, or we'd filter by user's workspace
  res.json(workspaces);
}

export async function createWorkspace(req: Request, res: Response) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const newWorkspace: Workspace = { id: `w_${uuidv4().slice(0, 8)}`, name };

  await appendJson('workspaces.json', newWorkspace);
  res.status(201).json(newWorkspace);
}

export async function getWorkspaceStats(req: Request, res: Response) {
  const { id } = req.params;
  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const suggestions = await readJson<AISuggestion[]>('suggestions.json', []);

  let kpiCount = 0;
  for (const k of kpis) { if (k.workspaceId === id) kpiCount++; }
  let transactionCount = 0;
  for (const t of transactions) { if (t.workspaceId === id) transactionCount++; }
  let suggestionCount = 0;
  for (const s of suggestions) { if (s.workspaceId === id) suggestionCount++; }

  res.json({ kpiCount, transactionCount, suggestionCount });
}
