import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from '../storage/index.js';

export async function getReports(req: Request, res: Response) {
  const { workspaceId } = req.query;
  const reports = await readJson<any[]>('reports.json', []);
  res.json(workspaceId ? reports.filter(r => r.workspaceId === workspaceId) : reports);
}

export async function createReport(req: Request, res: Response) {
  const { workspaceId, title, content } = req.body;
  const reports = await readJson<any[]>('reports.json', []);
  const newReport = {
    id: uuidv4(),
    workspaceId,
    title,
    content,
    createdAt: new Date().toISOString()
  };
  await writeJson('reports.json', [...reports, newReport]);
  res.status(201).json(newReport);
}
