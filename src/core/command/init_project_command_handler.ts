import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {loadConfig} from '../config/config_loader.js';
import {logger} from '../logger.js';
import {resolveLlmModel} from '../model/registry.js';
import {UtilLlm} from '../model/util_llm.js';
import {projectService} from '../project/project_service.js';
import {type CommandHandler} from './commnad_handler.js';

export class InitProjectCommandHandler implements CommandHandler {
  async handle(): Promise<void> {
    const cwd = process.cwd();
    const projectId = projectService.getProjectId();

    logger.info(`Initializing project in ${cwd}`);
    logger.info(`Project ID: ${projectId}`);

    // Gather context
    let context = `Project Path: ${cwd}\n\n`;

    // List top level files and dirs
    try {
      const files = await fs.readdir(cwd);
      context += `Top level files and directories:\n${files.join('\n')}\n\n`;
    } catch (e) {
      logger.error('Failed to read directory:', e);
    }

    // Read package.json if exists
    const packageJsonPath = path.join(cwd, 'package.json');
    try {
      const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
      context += `package.json:\n${packageJson}\n\n`;
    } catch (_e: unknown) {
      // Ignore if doesn't exist
    }

    // Read tsconfig.json if exists
    const tsconfigPath = path.join(cwd, 'tsconfig.json');
    try {
      const tsconfig = await fs.readFile(tsconfigPath, 'utf-8');
      context += `tsconfig.json:\n${tsconfig}\n\n`;
    } catch (_e: unknown) {
      // Ignore if doesn't exist
    }

    // Load config for UtilLlm
    const config = await loadConfig();
    const utilModelConfig = config.models.util;
    if (!utilModelConfig) {
      throw new Error('Util model config is missing');
    }
    const UtilModelClass = resolveLlmModel(utilModelConfig.modelName);
    const utilLlm = new UtilLlm(new UtilModelClass(utilModelConfig));

    logger.info('Scanning project constants with LLM...');
    const constants = await utilLlm.scanProjectConstants(context);

    logger.info('Saving constants...');
    await projectService.saveConstants(constants);

    logger.info(
      `Project constants saved to ${projectService.getConstantsPath()} in config store.`,
    );
  }
}
