import type { Request, Response } from 'express';
import { readJson, updateJson } from '../storage/index.js';
import type { AISuggestion, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getSuggestions(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const sugs = await readJson<AISuggestion[]>('suggestions.json', []);
  res.json(workspaceId ? sugs.filter(s => s.workspaceId === workspaceId) : sugs);
}

export async function updateSuggestion(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const sugs = await readJson<AISuggestion[]>('suggestions.json', []);
  const sug = sugs.find(s => s.id === id);

  if (!sug) return res.status(404).json({ error: 'Suggestion not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && sug.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { status } = req.body;
  const updates: Partial<AISuggestion> = {};
  if (status !== undefined) updates.status = status;

  await updateJson('suggestions.json', id, updates);
  res.json({ success: true });
}
