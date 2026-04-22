import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';

export const LIST_DIR_TOOL = new FunctionalTool({
  name: 'list_dir',
  description: 'Lists the contents of a directory.',
  params: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description:
          "The directory path to list. Defaults to '.' if not specified.",
      },
    },
  } as Schema,
  output: {
    type: Type.OBJECT,
    properties: {
      files: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'List of file and directory names',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {path?: string};
    const dirPath = typedInput.path || '.';
    const resolvedPath = path.resolve(dirPath);
    const cwd = process.cwd();

    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(
        `Access denied: Path ${resolvedPath} is outside the project directory.`,
      );
    }

    try {
      const files = await fs.readdir(resolvedPath);
      return {files};
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list directory: ${error.message}`);
      }
      throw new Error('Failed to list directory');
    }
  },
});
