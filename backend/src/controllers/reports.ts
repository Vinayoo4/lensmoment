import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../storage/index.js';
import type { Report, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getReports(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const reports = await readJson<Report[]>('reports.json', []);
  res.json(workspaceId ? reports.filter(r => r.workspaceId === workspaceId) : reports);
}

import { appendJson } from '../storage/index.js';

export async function createReport(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let { workspaceId } = req.body;
  const { title, content } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }
  const newReport: Report = {
    id: uuidv4(),
    workspaceId,
    title,
    content,
    createdAt: new Date().toISOString()
  };
  await appendJson('reports.json', newReport);
  res.status(201).json(newReport);
}
