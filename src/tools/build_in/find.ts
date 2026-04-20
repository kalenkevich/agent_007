import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';

export const FIND_TOOL = new FunctionalTool({
  name: 'find',
  description: 'Finds files matching a pattern.',
  params: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description:
          'The regular expression pattern to match against file names.',
      },
      path: {
        type: Type.STRING,
        description: "The path to search in. Defaults to '.' if not specified.",
      },
    },
    required: ['pattern'],
  } as Schema,
  output: {
    type: Type.OBJECT,
    properties: {
      files: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'List of matching file paths',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {pattern: string; path?: string};
    const patternStr = typedInput.pattern;
    const searchPath = typedInput.path || '.';
    const resolvedPath = path.resolve(searchPath);
    const cwd = process.cwd();

    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(
        `Access denied: Path ${resolvedPath} is outside the project directory.`,
      );
    }

    const regex = new RegExp(patternStr);
    const files: string[] = [];

    async function searchDir(dir: string) {
      const entries = await fs.readdir(dir, {withFileTypes: true});
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Match against the file/directory name
        if (regex.test(entry.name)) {
          files.push(path.relative(cwd, fullPath));
        }

        if (entry.isDirectory()) {
          if (entry.name === '.git' || entry.name === 'node_modules') {
            continue;
          }
          await searchDir(fullPath);
        }
      }
    }

    const stats = await fs.stat(resolvedPath);
    if (stats.isDirectory()) {
      await searchDir(resolvedPath);
    } else {
      throw new Error(`Path ${resolvedPath} is not a directory.`);
    }

    return {files};
  },
});
