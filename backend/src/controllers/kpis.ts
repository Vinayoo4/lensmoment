import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, updateJson, appendJson } from '../storage/index.js';
import type { KPIDefinition, KPIEntry, User } from '../../../shared/types/index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runQuantifyEngine } from './api.js';

export async function getKpis(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let workspaceId = req.query.workspaceId as string;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  res.json(workspaceId ? defs.filter(d => d.workspaceId === workspaceId) : defs);
}

export async function createKpiDef(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  let { workspaceId } = req.body;
  const { name, unit, targetValue } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }
  const newDef: KPIDefinition & { targetValue?: number } = { id: `k_${uuidv4().slice(0, 8)}`, workspaceId, name, unit, targetValue };
  await appendJson('kpi_defs.json', newDef);
  res.status(201).json(newDef);
}

export async function updateKpiDef(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  const def = defs.find(d => d.id === id);

  if (!def) return res.status(404).json({ error: 'KPI Definition not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && def.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, unit, targetValue } = req.body;
  const updates: Partial<KPIDefinition & { targetValue?: number }> = {};
  if (name !== undefined) updates.name = name;
  if (unit !== undefined) updates.unit = unit;
  if (targetValue !== undefined) updates.targetValue = Number(targetValue);

  await updateJson('kpi_defs.json', id, updates);
  res.json({ success: true });
}

export async function deleteKpiDef(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  const def = defs.find(d => d.id === id);

  if (!def) return res.status(404).json({ error: 'KPI Definition not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && def.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await writeJson('kpi_defs.json', defs.filter(d => d.id !== id));
  res.json({ success: true });
}

export async function getKpiEntries(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;

  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  const def = defs.find(d => d.id === id);

  if (!def) return res.status(404).json({ error: 'KPI Definition not found' });
  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all' && def.workspaceId !== user.workspaceId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const entries = await readJson<KPIEntry[]>('kpis.json', []);
  res.json(entries.filter(e => e.kpiId === id));
}

export async function createKpiEntry(req: Request, res: Response) {
  const user = (req as AuthRequest).user as User;
  const id = req.params.id as string;
  const { date, value, isSynced } = req.body;
  let { workspaceId } = req.body;

  if (user.role !== 'superadmin' && user.workspaceId !== 'w_all') {
    workspaceId = user.workspaceId;
  }

  const newEntry: KPIEntry = {
    id: uuidv4(),
    kpiId: id,
    date,
    value: Number(value),
    isSynced: isSynced !== false,
    workspaceId
  };

  await appendJson('kpis.json', newEntry);
  await runQuantifyEngine(workspaceId || 'w_01');

  res.status(201).json(newEntry);
}
