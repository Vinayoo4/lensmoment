export interface StorageProvider {
  read<T>(collection: string, defaultContent: T): Promise<T>;
  write<T>(collection: string, data: T): Promise<void>;
  append<T>(collection: string, item: T): Promise<void>;
  update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<void>;
}
