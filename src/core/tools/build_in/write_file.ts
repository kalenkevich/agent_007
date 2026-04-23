import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';
import {getMimeTypeAndEncoding} from '../../utils/file_extension_utils.js';

export const WRITE_FILE_TOOL = new FunctionalTool({
  name: 'write_file',
  description: 'Writes content to a file.',
  params: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'The path to the file to write.',
      },
      content: {
        type: Type.STRING,
        description: 'The content to write to the file.',
      },
    },
    required: ['path', 'content'],
  } as Schema,
  output: {
    type: Type.OBJECT,
    properties: {
      success: {
        type: Type.BOOLEAN,
        description: 'Whether the operation was successful',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {path: string; content: string};
    const filePath = typedInput.path;
    const content = typedInput.content;
    const resolvedPath = path.resolve(filePath);
    const cwd = process.cwd();

    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(
        `Access denied: Path ${resolvedPath} is outside the project directory.`,
      );
    }

    try {
      await fs.mkdir(path.dirname(resolvedPath), {recursive: true});
      await fs.writeFile(resolvedPath, content, 'utf-8');
      const extension = path.extname(resolvedPath);
      const {mimeType} = getMimeTypeAndEncoding(extension);

      return {
        success: true,
        artifacts: [
          {
            title: path.basename(resolvedPath),
            description: `File saved to ${filePath}`,
            content,
            filePath: resolvedPath,
            mimeType,
          },
        ],
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to write file: ${error.message}`);
      }

      throw new Error('Failed to write file');
    }
  },
});
