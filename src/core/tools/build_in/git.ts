import {spawn} from 'child_process';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';

export const GIT_TOOL = new FunctionalTool({
  name: 'git',
  description: 'Executes git commands within the project repository.',
  params: {
    type: Type.OBJECT,
    properties: {
      args: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description:
          'Arguments to pass to git (e.g., ["status"], ["add", "."]).',
      },
      cwd: {
        type: Type.STRING,
        description:
          'Optional working directory relative to the project root. Defaults to project root.',
      },
    },
    required: ['args'],
  } as Schema,
  output: {
    type: Type.OBJECT,
    properties: {
      stdout: {
        type: Type.STRING,
        description: 'The standard output from the git command.',
      },
      stderr: {
        type: Type.STRING,
        description: 'The standard error from the git command.',
      },
      exitCode: {
        type: Type.INTEGER,
        description: 'The exit code from the git command.',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {args: string[]; cwd?: string};
    const args = typedInput.args || [];
    const targetCwd = typedInput.cwd
      ? path.resolve(typedInput.cwd)
      : process.cwd();
    const projectCwd = process.cwd();

    if (!targetCwd.startsWith(projectCwd)) {
      throw new Error(
        `Access denied: Path ${targetCwd} is outside the project directory.`,
      );
    }

    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {
        cwd: targetCwd,
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('error', (err) => {
        reject(new Error(`Failed to run git command: ${err.message}`));
      });

      child.on('close', (exitCode) => {
        const response: any = {
          stdout,
          stderr,
          exitCode: exitCode ?? 0,
        };

        // If the output is non-empty, we can also add an artifact
        if (stdout.trim().length > 0) {
          response.artifacts = [
            {
              title: `git ${args.join(' ')}`,
              description: `Output of git ${args.join(' ')}`,
              content: stdout,
              mimeType: 'text/plain',
            },
          ];
        }

        resolve(response);
      });
    });
  },
});
