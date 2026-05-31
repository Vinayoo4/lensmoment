import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, updateJson } from '../storage/index.js';
import type { Transaction } from '../../../shared/types/index.js';
import { runQuantifyEngine } from './api.js';

export async function getTransactions(req: Request, res: Response) {
  const { workspaceId, status } = req.query;
  let txs = await readJson<Transaction[]>('transactions.json', []);
  if (workspaceId) txs = txs.filter(t => t.workspaceId === workspaceId);
  if (status) txs = txs.filter(t => t.status === status);
  res.json(txs);
}

export async function updateTransaction(req: Request, res: Response) {
  const id = req.params.id as string;
  await updateJson('transactions.json', id, req.body);

  const txs = await readJson<Transaction[]>('transactions.json', []);
  const tx = txs.find(t => t.id === id);
  if (tx) await runQuantifyEngine(tx.workspaceId);

  res.json({ success: true });
}

export async function deleteTransaction(req: Request, res: Response) {
  const id = req.params.id as string;
  const txs = await readJson<Transaction[]>('transactions.json', []);
  const tx = txs.find(t => t.id === id);
  if (tx) {
      await writeJson('transactions.json', txs.filter(t => t.id !== id));
      await runQuantifyEngine(tx.workspaceId);
  }
  res.json({ success: true });
}
