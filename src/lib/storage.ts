// src/lib/storage.ts
// Abstracción StorageProvider — hoy disco local, mañana S3
import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}

// ── Implementación: Disco local ──
class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_PATH || '/var/data/aurosolar/uploads';
  }

  async upload(key: string, data: Buffer, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    await fs.unlink(fullPath).catch(() => {});
  }

  getUrl(key: string): string {
    return `/api/storage/${encodeURIComponent(key)}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, key));
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton — cambiar aquí para migrar a S3
export const storage: StorageProvider = new LocalStorageProvider();
