import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {checkAndPromptVersion} from '../../../src/cli/version_check.js';

vi.mock('node:fs');
vi.mock('node:readline/promises');
vi.mock('node:child_process');

describe('version_check', () => {
  let exitSpy: any;
  let logSpy: any;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should do nothing if version is up to date', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.2'}),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({'dist-tags': {latest: '0.0.2'}}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await checkAndPromptVersion();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should do nothing if current version is newer (dev)', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.3'}),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({'dist-tags': {latest: '0.0.2'}}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await checkAndPromptVersion();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should prompt and attempt update if version is stale and user says yes', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.1'}),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({'dist-tags': {latest: '0.0.2'}}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockRl = {
      question: vi.fn().mockResolvedValue('yes'),
      close: vi.fn(),
    };
    vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

    vi.mocked(child_process.spawnSync).mockReturnValue({status: 0} as any);

    await checkAndPromptVersion();

    expect(mockRl.question).toHaveBeenCalled();
    expect(child_process.spawnSync).toHaveBeenCalledWith(
      'npm',
      ['install', '-g', '@kalenkevich/agent_007'],
      expect.any(Object),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Update successful!'),
    );
  });

  it('should handle update failure and show manual command', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.1'}),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({'dist-tags': {latest: '0.0.2'}}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockRl = {
      question: vi.fn().mockResolvedValue('yes'),
      close: vi.fn(),
    };
    vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

    vi.mocked(child_process.spawnSync).mockReturnValue({status: 1} as any);

    await checkAndPromptVersion();

    expect(mockRl.question).toHaveBeenCalled();
    expect(child_process.spawnSync).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Update failed.'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Please try running manually'),
    );
  });

  it('should prompt and NOT exit if version is stale and user says no', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.1'}),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({'dist-tags': {latest: '0.0.2'}}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockRl = {
      question: vi.fn().mockResolvedValue('no'),
      close: vi.fn(),
    };
    vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

    await checkAndPromptVersion();

    expect(mockRl.question).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(child_process.spawnSync).not.toHaveBeenCalled();
  });

  it('should handle fetch failure gracefully', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({version: '0.0.1'}),
    );

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    await checkAndPromptVersion();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
