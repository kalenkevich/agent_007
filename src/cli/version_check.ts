import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {stdin as input, stdout as output} from 'node:process';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {isYes} from './prompt_utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getCurrentVersion(): string | null {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch (error) {
    if (process.env.DEBUG_LOGGER === 'true') {
      console.error('Failed to read package.json version:', error);
    }
    return null;
  }
}

async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      'https://registry.npmjs.org/@kalenkevich/agent_007',
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data['dist-tags']?.latest || null;
  } catch (error) {
    if (process.env.DEBUG_LOGGER === 'true') {
      console.error('Failed to fetch latest version from npm:', error);
    }
    return null;
  }
}

function isStale(current: string, latest: string): boolean {
  if (current === latest) return false;

  const curParts = current.split('.').map(Number);
  const latParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
    const cur = curParts[i] || 0;
    const lat = latParts[i] || 0;
    if (lat > cur) return true;
    if (cur > lat) return false;
  }
  return false;
}

export async function checkAndPromptVersion() {
  const current = getCurrentVersion();
  if (!current) return;

  const latest = await getLatestVersion();
  if (!latest) return;

  if (isStale(current, latest)) {
    console.log(
      `\n⚠️ A new version of agent007 is available: ${latest} (current: ${current})`,
    );

    const rl = createInterface({input, output});
    try {
      const answer = await rl.question(
        'Do you want to update to the latest version? (yes/no) [default: no]: ',
      );
      if (isYes(answer, false)) {
        console.log('\nAttempting to update @kalenkevich/agent_007...');
        const result = spawnSync(
          'npm',
          ['install', '-g', '@kalenkevich/agent_007'],
          {
            stdio: 'inherit',
          },
        );

        if (result.status === 0) {
          console.log('\nUpdate successful! Please restart the CLI.');
          process.exit(0);
        } else {
          console.log('\nUpdate failed.');
          console.log(
            'Please try running manually: npm install -g @kalenkevich/agent_007',
          );
          process.exit(result.status || 1);
        }
      }
    } finally {
      rl.close();
    }
  }
}
