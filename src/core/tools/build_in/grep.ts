import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';

export const GREP_TOOL = new FunctionalTool({
  name: 'grep',
  description: 'Searches for a regular expression pattern in files.',
  params: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: 'The regular expression pattern to search for.',
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
      matches: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            file: {type: Type.STRING},
            line: {type: Type.INTEGER},
            content: {type: Type.STRING},
          },
        },
        description: 'List of matches found',
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
    const matches: Array<{file: string; line: number; content: string}> = [];

    async function searchDir(dir: string) {
      const entries = await fs.readdir(dir, {withFileTypes: true});
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '.git' || entry.name === 'node_modules') {
            continue; // Skip these by default for sanity
          }
          await searchDir(fullPath);
        } else if (entry.isFile()) {
          await searchFile(fullPath);
        }
      }
    }

    async function searchFile(filePath: string) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              file: path.relative(cwd, filePath),
              line: i + 1,
              content: lines[i],
            });
          }
        }
      } catch (_e: unknown) {
        // Ignore files that cannot be read as text or other errors
      }
    }

    // Check if resolvedPath is a file or directory
    const stats = await fs.stat(resolvedPath);
    if (stats.isFile()) {
      await searchFile(resolvedPath);
    } else if (stats.isDirectory()) {
      await searchDir(resolvedPath);
    } else {
      throw new Error(
        `Path ${resolvedPath} is neither a file nor a directory.`,
      );
    }

    return {matches};
  },
});
