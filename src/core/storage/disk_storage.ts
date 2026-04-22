import * as fs from 'node:fs/promises';
import {type Storage} from './storage.js';

export class DiskStorage implements Storage {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, data: string): Promise<void> {
    await fs.writeFile(filePath, data, 'utf-8');
  }

  async readdir(folderPath: string): Promise<string[]> {
    return fs.readdir(folderPath);
  }

  async mkdir(folderPath: string, options?: {recursive?: boolean}): Promise<void> {
    await fs.mkdir(folderPath, options);
  }

  async rm(folderPath: string, options?: {recursive?: boolean; force?: boolean}): Promise<void> {
    await fs.rm(folderPath, options);
  }
}
