import { JsonStorageProvider } from './jsonProvider.js';
import type { StorageProvider } from './interfaces.js';

// This acts as the singleton instance of the current storage provider.
// If we migrate to Appwrite, we'd replace this with new AppwriteStorageProvider().
export const storage: StorageProvider = new JsonStorageProvider();

// For backward compatibility while refactoring controllers
export async function readJson<T>(filename: string, defaultContent: T): Promise<T> {
  const collection = filename.replace('.json', '');
  return storage.read<T>(collection, defaultContent);
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const collection = filename.replace('.json', '');
  return storage.write<T>(collection, data);
}

export async function appendJson<T>(filename: string, item: T): Promise<void> {
  const collection = filename.replace('.json', '');
  return storage.append<T>(collection, item);
}

export async function updateJson<T extends { id: string }>(filename: string, id: string, updates: Partial<T>): Promise<void> {
  const collection = filename.replace('.json', '');
  return storage.update<T>(collection, id, updates);
}
