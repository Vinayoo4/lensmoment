import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is dist/backend/src/storage or src/storage. Let's make dataDir point to root/data consistently.
const projectRoot = path.resolve(__dirname, __dirname.includes('dist') ? '../../../..' : '../../..');
const dataDir = path.join(projectRoot, 'data');

async function ensureFile<T>(filePath: string, defaultContent: T) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
  }
}

const fileLocks: Record<string, Promise<void>> = {};

async function acquireLock(filename: string): Promise<() => void> {
  while (fileLocks[filename]) {
    await fileLocks[filename];
  }
  let resolveLock: () => void = () => {};
  fileLocks[filename] = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  return () => {
    delete fileLocks[filename];
    resolveLock();
  };
}

export async function readJson<T>(filename: string, defaultContent: T): Promise<T> {
  const filePath = path.join(dataDir, filename);
  const release = await acquireLock(filename);
  try {
    await ensureFile(filePath, defaultContent);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } finally {
    release();
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, filename);
  const release = await acquireLock(filename);
  try {
    await ensureFile(filePath, []);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } finally {
    release();
  }
}

export async function appendJson<T>(filename: string, item: T): Promise<void> {
  const release = await acquireLock(filename);
  try {
    const filePath = path.join(dataDir, filename);
    await ensureFile(filePath, []);
    const dataRaw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(dataRaw) as T[];
    data.push(item);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } finally {
    release();
  }
}

export async function updateJson<T extends { id: string }>(filename: string, id: string, updates: Partial<T>): Promise<void> {
  const release = await acquireLock(filename);
  try {
    const filePath = path.join(dataDir, filename);
    await ensureFile(filePath, []);
    const dataRaw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(dataRaw) as T[];
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates } as T;
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
  } finally {
    release();
  }
}
