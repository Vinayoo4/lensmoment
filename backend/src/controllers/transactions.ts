import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, updateJson } from '../storage/index.js';
import type { Transaction, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runQuantifyEngine } from './api.js';

export async function getTransactions(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string;
  const status = req.query.status as string;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  let txs = await readJson<Transaction[]>('transactions.json', []);
  if (workspaceId) txs = txs.filter(t => t.workspaceId === workspaceId);
  if (status) txs = txs.filter(t => t.status === status);
  res.json(txs);
}

export async function updateTransaction(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const txs = await readJson<Transaction[]>('transactions.json', []);
  const tx = txs.find(t => t.id === id);

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && tx.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await updateJson('transactions.json', id, req.body);
  if (tx.workspaceId) await runQuantifyEngine(tx.workspaceId);

  res.json({ success: true });
}

export async function deleteTransaction(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const txs = await readJson<Transaction[]>('transactions.json', []);
  const tx = txs.find(t => t.id === id);

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && tx.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await writeJson('transactions.json', txs.filter(t => t.id !== id));
  if (tx.workspaceId) await runQuantifyEngine(tx.workspaceId);

  res.json({ success: true });
}
