import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {DiskStorage} from '../../../src/core/storage/disk_storage.js';

describe('DiskStorage', () => {
  const testDir = path.join(os.tmpdir(), 'diskstorage_test');
  const storage = new DiskStorage();

  beforeEach(async () => {
    await fs.mkdir(testDir, {recursive: true});
  });

  afterEach(async () => {
    await fs.rm(testDir, {recursive: true, force: true});
  });

  it('should correctly write and read from a file', async () => {
    const filePath = path.join(testDir, 'sample.txt');
    await storage.writeFile(filePath, 'Hello world');
    const content = await storage.readFile(filePath);
    expect(content).toBe('Hello world');
  });

  it('should read the contents of a directory', async () => {
    const file1 = path.join(testDir, 'f1.txt');
    const file2 = path.join(testDir, 'f2.txt');
    await fs.writeFile(file1, 'one');
    await fs.writeFile(file2, 'two');

    const contents = await storage.readdir(testDir);
    expect(contents).toHaveLength(2);
    expect(contents).toContain('f1.txt');
    expect(contents).toContain('f2.txt');
  });

  it('should create a new directory recursively', async () => {
    const nestedDir = path.join(testDir, 'a', 'b', 'c');
    await storage.mkdir(nestedDir, {recursive: true});
    const stat = await fs.stat(nestedDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('should remove a directory recursively', async () => {
    const nestedDir = path.join(testDir, 'nested');
    await fs.mkdir(nestedDir);
    await storage.rm(nestedDir, {recursive: true, force: true});
    await expect(fs.stat(nestedDir)).rejects.toThrow(/ENOENT/);
  });
});
