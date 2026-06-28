import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, updateJson } from '../storage/index.js';
import type { ReconciliationState, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getReconciliations(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const recs = await readJson<ReconciliationState[]>('reconciliations.json', []);
  res.json(workspaceId ? recs.filter(r => r.workspaceId === workspaceId) : recs);
}

export async function createOrUpdateReconciliation(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let { workspaceId } = req.body;
  const { month, discrepanciesCount, isDraft } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }
  const recs = await readJson<ReconciliationState[]>('reconciliations.json', []);

  const existingIndex = recs.findIndex(r => r.workspaceId === workspaceId && r.month === month);

  if (existingIndex !== -1) {
    recs[existingIndex] = { ...recs[existingIndex], discrepanciesCount, isDraft };
    await writeJson('reconciliations.json', recs);
    res.json(recs[existingIndex]);
  } else {
    const newRec: ReconciliationState = { id: uuidv4(), workspaceId, month, discrepanciesCount, isDraft };
    await writeJson('reconciliations.json', [...recs, newRec]);
    res.status(201).json(newRec);
  }
}
