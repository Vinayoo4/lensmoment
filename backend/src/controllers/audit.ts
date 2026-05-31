import type { Request, Response } from 'express';
import { readJson } from '../storage/index.js';
import type { AuditLog } from '../../../shared/types/index.js';

export async function getAuditLogs(req: Request, res: Response) {
  const logs = await readJson<AuditLog[]>('audit.json', []);
  res.json(logs); // We'd add pagination and admin checks here
}
