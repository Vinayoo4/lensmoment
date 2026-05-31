import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../storage/index.js';
import type { Workspace, KPIEntry, Transaction, AISuggestion } from '../../../shared/types/index.js';

export async function getWorkspaces(req: Request, res: Response) {
  const workspaces = await readJson<Workspace[]>('workspaces.json', []);
  // Assuming a user can see all for MVP, or we'd filter by user's workspace
  res.json(workspaces);
}

export async function createWorkspace(req: Request, res: Response) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const workspaces = await readJson<Workspace[]>('workspaces.json', []);
  const newWorkspace: Workspace = { id: `w_${uuidv4().slice(0, 8)}`, name };

  await writeJson('workspaces.json', [...workspaces, newWorkspace]);
  res.status(201).json(newWorkspace);
}

export async function getWorkspaceStats(req: Request, res: Response) {
  const { id } = req.params;
  const kpis = await readJson<KPIEntry[]>('kpis.json', []);
  const transactions = await readJson<Transaction[]>('transactions.json', []);
  const suggestions = await readJson<AISuggestion[]>('suggestions.json', []);

  res.json({
    kpiCount: kpis.filter((k: any) => k.workspaceId === id).length,
    transactionCount: transactions.filter(t => t.workspaceId === id).length,
    suggestionCount: suggestions.filter(s => s.workspaceId === id).length
  });
}
