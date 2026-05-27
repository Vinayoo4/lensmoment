import fs from 'fs/promises';
import path from 'path';

const dataDir = path.resolve(process.cwd(), '../data');

async function ensureFile(filePath: string, defaultContent: any) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

export async function readJson<T>(filename: string, defaultContent: T): Promise<T> {
  const filePath = path.join(dataDir, filename);
  await ensureFile(filePath, defaultContent);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data) as T;
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, filename);
  await ensureFile(filePath, []);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function appendJson<T>(filename: string, item: T): Promise<void> {
  const data = await readJson<T[]>(filename, []);
  data.push(item);
  await writeJson(filename, data);
}

export async function updateJson<T extends { id: string }>(filename: string, id: string, updates: Partial<T>): Promise<void> {
  const data = await readJson<T[]>(filename, []);
  const index = data.findIndex(item => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updates } as T;
    await writeJson(filename, data);
  }
}
