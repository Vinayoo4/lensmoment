import type { Request, Response } from 'express';
import { readJson, updateJson } from '../storage/index.js';
import type { AISuggestion } from '../../../shared/types/index.js';

export async function getSuggestions(req: Request, res: Response) {
  const { workspaceId } = req.query;
  const sugs = await readJson<AISuggestion[]>('suggestions.json', []);
  res.json(workspaceId ? sugs.filter(s => s.workspaceId === workspaceId) : sugs);
}

export async function updateSuggestion(req: Request, res: Response) {
  const id = req.params.id as string;
  await updateJson('suggestions.json', id, req.body);
  res.json({ success: true });
}
