import {spawn} from 'child_process';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  GIT_DIFF_TOOL,
  GIT_STATUS_TOOL,
} from '../../../src/core/tools/git/git_toolset.js';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('GitToolset', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should execute git status via GIT_STATUS_TOOL', async () => {
    const mockStdoutOn = vi.fn();
    const mockStderrOn = vi.fn();
    const mockOn = vi.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });

    vi.mocked(spawn).mockReturnValue({
      stdout: {on: mockStdoutOn},
      stderr: {on: mockStderrOn},
      on: mockOn,
    } as any);

    // Set up the data callbacks
    mockStdoutOn.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('On branch main\n'));
      }
    });

    const result = await GIT_STATUS_TOOL.execute({});

    expect(result.stdout).toContain('On branch main');
    expect(result.exitCode).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      'git',
      ['status'],
      expect.objectContaining({cwd: process.cwd()}),
    );
  });

  it('should execute git diff via GIT_DIFF_TOOL', async () => {
    const mockStdoutOn = vi.fn();
    const mockStderrOn = vi.fn();
    const mockOn = vi.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });

    vi.mocked(spawn).mockReturnValue({
      stdout: {on: mockStdoutOn},
      stderr: {on: mockStderrOn},
      on: mockOn,
    } as any);

    mockStdoutOn.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('diff --git a/test.ts b/test.ts\n'));
      }
    });

    const result = await GIT_DIFF_TOOL.execute({staged: true});

    expect(result.stdout).toContain('diff --git');
    expect(result.exitCode).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      'git',
      ['diff', '--staged'],
      expect.objectContaining({cwd: process.cwd()}),
    );
  });

  it('should throw error if path is outside project', async () => {
    await expect(GIT_STATUS_TOOL.execute({cwd: '../outside'})).rejects.toThrow(
      /Access denied/,
    );
  });
});
