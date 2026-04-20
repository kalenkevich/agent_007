import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';

export const VIEW_FILE_TOOL = new FunctionalTool({
  name: 'view_file',
  description: 'Reads the content of a file.',
  params: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'The path to the file to read.',
      },
    },
    required: ['path'],
  } as Schema,
  output: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: 'The content of the file',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {path: string};
    const filePath = typedInput.path;
    const resolvedPath = path.resolve(filePath);
    const cwd = process.cwd();

    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(
        `Access denied: Path ${resolvedPath} is outside the project directory.`,
      );
    }

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      return {content};
    } catch (_e: unknown) {
      if (_e instanceof Error) {
        throw new Error(`Failed to read file: ${_e.message}`);
      }

      throw new Error('Failed to read file');
    }
  },
});
