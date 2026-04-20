import {createHash} from 'node:crypto';
import {configStore} from '../config/config_store.js';

export class ProjectService {
  private cwd: string;
  private projectId: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.projectId = createHash('sha256').update(this.cwd).digest('hex');
  }

  getProjectId(): string {
    return this.projectId;
  }

  getConstantsPath(): string {
    return `projects/${this.projectId}/constants.json`;
  }

  async getConstants(): Promise<string | null> {
    return await configStore.get(this.getConstantsPath());
  }

  async saveConstants(constants: unknown): Promise<void> {
    await configStore.set(
      this.getConstantsPath(),
      JSON.stringify(constants, null, 2),
    );
  }

  async isInitialized(): Promise<boolean> {
    const constants = await this.getConstants();
    return constants !== null;
  }
}

export const projectService = new ProjectService();
