import {CodeExecutionLanguage} from '../../content.js';
import {materializeFiles} from '../../utils/file_utils.js';
import {FunctionalTool} from '../functional_tool.js';
import {Type} from '../schema.js';
import {SkillToolset} from './skill_toolset.js';

export class RunSkillInlineScriptTool extends FunctionalTool {
  constructor(private toolset: SkillToolset) {
    super({
      name: 'run_skill_inline_script',
      description:
        'Executes an inline script provided directly in the request.',
      params: {
        type: Type.OBJECT,
        properties: {
          script_content: {
            type: Type.STRING,
            description: 'The content of the script to execute.',
          },
          language: {
            type: Type.STRING,
            description: 'The language/type of the script.',
            enum: Object.values(CodeExecutionLanguage).filter(
              (l) => l !== CodeExecutionLanguage.UNSPECIFIED,
            ) as string[],
          },
          args: {
            anyOf: [
              {type: Type.OBJECT},
              {type: Type.ARRAY, items: {type: Type.STRING}},
            ],
            description:
              'Optional arguments to pass to the script as key-value pairs or an array of strings.',
          },
        },
        required: ['script_content', 'language'],
      },
      execute: async (_args: unknown): Promise<unknown> => {
        const args = _args as {
          script_content: string;
          language: string;
          args?: string[] | Record<string, string | number | boolean>;
        };
        const inlineScriptContent = args.script_content;
        const language = args.language;
        const scriptArgs = args.args;

        if (!inlineScriptContent) {
          return {
            error: 'Script content is required.',
            errorCode: 'MISSING_SCRIPT_CONTENT',
          };
        }
        if (!language) {
          return {
            error: 'Language is required.',
            errorCode: 'MISSING_LANGUAGE',
          };
        }

        const codeExecutor = this.toolset.codeExecutor;

        if (!codeExecutor) {
          return {
            error: 'No code executor configured.',
            errorCode: 'NO_CODE_EXECUTOR',
          };
        }

        try {
          const result = await codeExecutor.executeCode({
            codeExecutionInput: {
              code: inlineScriptContent,
              inputFiles: [],
              language: language as CodeExecutionLanguage,
              args: scriptArgs,
            },
          });

          // Final filename could be different if there was a collision, so update the result.
          result.outputFiles = await materializeFiles(result.outputFiles);

          return result;
        } catch (e: unknown) {
          return {
            error: `Failed to execute inline script: ${(e as Error).message}`,
            errorCode: 'EXECUTION_ERROR',
          };
        }
      },
    });
  }
}
