import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {WRITE_FILE_TOOL} from '../../../src/tools/build_in/write_file.js';

vi.mock('node:fs/promises');

describe('WriteFileTool', () => {
  it('should write file content', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);

    const result = await WRITE_FILE_TOOL.execute({
      path: 'test.txt',
      content: 'hello',
    });

    expect(result).toEqual({success: true});
    expect(fs.mkdir).toHaveBeenCalledWith(
      path.dirname(path.resolve('test.txt')),
      {recursive: true},
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.resolve('test.txt'),
      'hello',
      'utf-8',
    );
  });

  it('should throw error if path is outside project', async () => {
    await expect(
      WRITE_FILE_TOOL.execute({path: '../outside.txt', content: 'hello'}),
    ).rejects.toThrow(/Access denied/);
  });

  it('should handle writeFile errors', async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
    vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write error') as any);

    await expect(
      WRITE_FILE_TOOL.execute({path: 'test.txt', content: 'hello'}),
    ).rejects.toThrow(/Failed to write file/);
  });
});
