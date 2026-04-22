import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function loadEnv(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const rootEnvPath = join(__dirname, '../../.env');
  const cwdEnvPath = join(process.cwd(), '.env');

  if (existsSync(cwdEnvPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(cwdEnvPath);
      }
    } catch (err) {
      console.error(`Failed to load .env from ${cwdEnvPath}:`, err);
    }
  } else if (existsSync(rootEnvPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(rootEnvPath);
      }
    } catch (err) {
      console.error(`Failed to load .env from ${rootEnvPath}:`, err);
    }
  }
}
