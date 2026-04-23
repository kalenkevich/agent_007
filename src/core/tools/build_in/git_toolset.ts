import {spawn} from 'child_process';
import * as path from 'node:path';
import {FunctionalTool} from '../functional_tool.js';
import {type Schema, Type} from '../schema.js';
import {type Tool} from '../tool.js';
import {Toolset} from '../toolset.js';

async function runGit(
  args: string[],
  cwd?: string,
): Promise<{stdout: string; stderr: string; exitCode: number}> {
  const targetCwd = cwd ? path.resolve(cwd) : process.cwd();
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
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 0,
      });
    });
  });
}

export const GIT_STATUS_TOOL = new FunctionalTool({
  name: 'git_status',
  description: 'Runs git status to see the current state of the repository.',
  params: {
    type: Type.OBJECT,
    properties: {
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {cwd?: string};
    const res = await runGit(['status'], typedInput.cwd);
    return {
      ...res,
      artifacts: [
        {
          title: 'git status',
          description: 'Git repository status',
          content: res.stdout,
          mimeType: 'text/plain',
        },
      ],
    };
  },
});

export const GIT_DIFF_TOOL = new FunctionalTool({
  name: 'git_diff',
  description: 'Runs git diff to see file changes.',
  params: {
    type: Type.OBJECT,
    properties: {
      staged: {
        type: Type.BOOLEAN,
        description: 'Whether to show diff for staged changes.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {staged?: boolean; cwd?: string};
    const args = ['diff'];
    if (typedInput.staged) {
      args.push('--staged');
    }
    const res = await runGit(args, typedInput.cwd);
    return {
      ...res,
      artifacts: [
        {
          title: `git diff${typedInput.staged ? ' --staged' : ''}`,
          description: 'Git diff output',
          content: res.stdout,
          mimeType: 'text/plain',
        },
      ],
    };
  },
});

export const GIT_ADD_TOOL = new FunctionalTool({
  name: 'git_add',
  description: 'Stages changes by running git add.',
  params: {
    type: Type.OBJECT,
    properties: {
      files: {
        type: Type.ARRAY,
        items: {type: Type.STRING},
        description: 'Paths to files to add. Use ["."] to add all changes.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
    required: ['files'],
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {files: string[]; cwd?: string};
    const res = await runGit(['add', ...typedInput.files], typedInput.cwd);
    return res;
  },
});

export const GIT_COMMIT_TOOL = new FunctionalTool({
  name: 'git_commit',
  description: 'Creates a commit with the staged changes.',
  params: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: 'The commit message.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
    required: ['message'],
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {message: string; cwd?: string};
    const res = await runGit(
      ['commit', '-m', typedInput.message],
      typedInput.cwd,
    );
    return res;
  },
});

export const GIT_LOG_TOOL = new FunctionalTool({
  name: 'git_log',
  description: 'Runs git log to view recent commits.',
  params: {
    type: Type.OBJECT,
    properties: {
      maxCount: {
        type: Type.INTEGER,
        description: 'Maximum number of commits to show. Defaults to 10.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {maxCount?: number; cwd?: string};
    const maxCount = typedInput.maxCount ?? 10;
    const res = await runGit(
      ['log', `-n`, String(maxCount), '--oneline'],
      typedInput.cwd,
    );
    return {
      ...res,
      artifacts: [
        {
          title: 'git log',
          description: 'Recent commits',
          content: res.stdout,
          mimeType: 'text/plain',
        },
      ],
    };
  },
});

export const GIT_CHECKOUT_TOOL = new FunctionalTool({
  name: 'git_checkout',
  description: 'Runs git checkout to switch branches or restore files.',
  params: {
    type: Type.OBJECT,
    properties: {
      branchOrFile: {
        type: Type.STRING,
        description: 'The branch name or file path to checkout.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
    required: ['branchOrFile'],
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {branchOrFile: string; cwd?: string};
    const res = await runGit(
      ['checkout', typedInput.branchOrFile],
      typedInput.cwd,
    );
    return res;
  },
});

export const GIT_GENERIC_TOOL = new FunctionalTool({
  name: 'git_command',
  description: 'Runs an arbitrary git command with arguments.',
  params: {
    type: Type.OBJECT,
    properties: {
      args: {
        type: Type.ARRAY,
        items: {type: Type.STRING},
        description: 'Arguments to pass to git.',
      },
      cwd: {
        type: Type.STRING,
        description: 'Optional working directory.',
      },
    },
    required: ['args'],
  } as Schema,
  execute: async (input: unknown) => {
    const typedInput = input as {args: string[]; cwd?: string};
    const res = await runGit(typedInput.args, typedInput.cwd);
    return {
      ...res,
      artifacts: [
        {
          title: `git ${typedInput.args.join(' ')}`,
          description: `Output of git ${typedInput.args.join(' ')}`,
          content: res.stdout,
          mimeType: 'text/plain',
        },
      ],
    };
  },
});

export class GitToolset extends Toolset {
  private tools: Tool[];

  constructor(options: {toolFilter?: string[]} = {}) {
    super({
      name: 'git_toolset',
      description: 'Toolset for managing Git repository.',
      toolFilter: options.toolFilter,
    });

    this.tools = [
      GIT_STATUS_TOOL,
      GIT_DIFF_TOOL,
      GIT_ADD_TOOL,
      GIT_COMMIT_TOOL,
      GIT_LOG_TOOL,
      GIT_CHECKOUT_TOOL,
      GIT_GENERIC_TOOL,
    ];
  }

  override async getTools(): Promise<Tool[]> {
    return this.tools.filter((tool) => this.isToolSelected(tool));
  }
}
