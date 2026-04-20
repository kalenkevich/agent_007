import * as fs from 'node:fs/promises';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {GREP_TOOL} from '../../../src/tools/build_in/grep.js';

vi.mock('node:fs/promises');

describe('GrepTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should find matches in a file', async () => {
    const mockStats = {isFile: () => true, isDirectory: () => false};
    vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
    vi.mocked(fs.readFile).mockResolvedValue('line1\nmatch this\nline3' as any);

    const result = await GREP_TOOL.execute({
      pattern: 'match',
      path: 'test.txt',
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toEqual({
      file: 'test.txt',
      line: 2,
      content: 'match this',
    });
  });

  it('should throw error if path is outside project', async () => {
    await expect(
      GREP_TOOL.execute({pattern: 'test', path: '../outside.txt'}),
    ).rejects.toThrow(/Access denied/);
  });

  it('should handle file read errors gracefully (ignore file)', async () => {
    const mockStats = {isFile: () => true, isDirectory: () => false};
    vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error') as any);

    const result = await GREP_TOOL.execute({pattern: 'test', path: 'test.txt'});

    expect(result.matches).toHaveLength(0);
  });
});
