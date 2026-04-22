import * as path from 'node:path';
import {APP_FILE_DIR} from './app_dir.js';
import {type Storage} from '../storage/storage.js';
import {DiskStorage} from '../storage/disk_storage.js';

export class ConfigStore {
  private configDir: string;
  private storage: Storage;

  constructor(storage: Storage = new DiskStorage()) {
    this.storage = storage;
    this.configDir = APP_FILE_DIR;
  }

  private async ensureDir() {
    await this.storage.mkdir(this.configDir, {recursive: true});
  }

  async getApiKey(): Promise<string | null> {
    const keyFilePath = path.join(this.configDir, 'api_key');
    try {
      const content = await this.storage.readFile(keyFilePath);
      return content.trim();
    } catch (_e: unknown) {
      return null;
    }
  }

  async setApiKey(key: string): Promise<void> {
    await this.ensureDir();
    const keyFilePath = path.join(this.configDir, 'api_key');
    await this.storage.writeFile(keyFilePath, key.trim());
  }

  async get(filename: string): Promise<string | null> {
    const filePath = path.join(this.configDir, filename);
    try {
      const content = await this.storage.readFile(filePath);
      return content.trim();
    } catch (_e: unknown) {
      return null;
    }
  }

  async set(filename: string, value: string): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.configDir, filename);
    await this.storage.mkdir(path.dirname(filePath), {recursive: true});
    await this.storage.writeFile(filePath, value.trim());
  }
}

export const configStore = new ConfigStore();
