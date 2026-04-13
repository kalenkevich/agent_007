import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export class ConfigStore {
  private configDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), ".agent_007");
  }

  private async ensureDir() {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  async getApiKey(): Promise<string | null> {
    const keyFilePath = path.join(this.configDir, "api_key");
    try {
      const content = await fs.readFile(keyFilePath, "utf-8");
      return content.trim();
    } catch (error) {
      return null;
    }
  }

  async setApiKey(key: string): Promise<void> {
    await this.ensureDir();
    const keyFilePath = path.join(this.configDir, "api_key");
    await fs.writeFile(keyFilePath, key.trim(), "utf-8");
  }

  async get(filename: string): Promise<string | null> {
    const filePath = path.join(this.configDir, filename);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content.trim();
    } catch (error) {
      return null;
    }
  }

  async set(filename: string, value: string): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.configDir, filename);
    await fs.writeFile(filePath, value.trim(), "utf-8");
  }
}

export const configStore = new ConfigStore();
