import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, updateJson } from '../storage/index.js';
import type { KPIDefinition, KPIEntry } from '../../../shared/types/index.js';
import { runQuantifyEngine } from './api.js';

export async function getKpis(req: Request, res: Response) {
  const workspaceId = req.query.workspaceId as string;
  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  res.json(workspaceId ? defs.filter(d => d.workspaceId === workspaceId) : defs);
}

export async function createKpiDef(req: Request, res: Response) {
  const { workspaceId, name, unit, targetValue } = req.body;
  const defs = await readJson<(KPIDefinition & { targetValue?: number })[]>('kpi_defs.json', []);
  const newDef: KPIDefinition & { targetValue?: number } = { id: `k_${uuidv4().slice(0, 8)}`, workspaceId, name, unit, targetValue };
  await writeJson('kpi_defs.json', [...defs, newDef]);
  res.status(201).json(newDef);
}

export async function updateKpiDef(req: Request, res: Response) {
  const id = req.params.id as string;
  await updateJson('kpi_defs.json', id, req.body);
  res.json({ success: true });
}

export async function deleteKpiDef(req: Request, res: Response) {
  const id = req.params.id as string;
  const defs = await readJson<KPIDefinition[]>('kpi_defs.json', []);
  await writeJson('kpi_defs.json', defs.filter(d => d.id !== id));
  res.json({ success: true });
}

export async function getKpiEntries(req: Request, res: Response) {
  const id = req.params.id as string;
  const entries = await readJson<KPIEntry[]>('kpis.json', []);
  res.json(entries.filter(e => e.kpiId === id));
}

export async function createKpiEntry(req: Request, res: Response) {
  const id = req.params.id as string;
  const { date, value, isSynced, workspaceId } = req.body;

  const entries = await readJson<KPIEntry[]>('kpis.json', []);
  const newEntry: KPIEntry = {
    id: uuidv4(),
    kpiId: id,
    date,
    value: Number(value),
    isSynced: isSynced !== false,
    workspaceId
  };

  await writeJson('kpis.json', [...entries, newEntry]);
  await runQuantifyEngine(workspaceId || 'w_01');

  res.status(201).json(newEntry);
}
