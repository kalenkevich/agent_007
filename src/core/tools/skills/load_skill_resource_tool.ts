import path from 'node:path';
import {ContentRole, isFunctionResponseContentPart} from '../../content.js';
import type {LlmRequest} from '../../model/request.js';
import {FunctionalTool} from '../functional_tool.js';
import {Type} from '../schema.js';
import {SkillToolset} from './skill_toolset.js';

const BINARY_FILE_DETECTED_MSG =
  'Binary file detected. The content has been injected into the conversation history for you to analyze.';

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  sh: 'text/x-shellscript',
  bash: 'text/x-shellscript',
  py: 'text/x-python',
  js: 'text/javascript',
  cjs: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/javascript',
  cts: 'text/javascript',
  mts: 'text/javascript',
};

function guessMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  return EXTENSION_TO_MIME_TYPE[ext] || 'application/octet-stream';
}

export class LoadSkillResourceTool extends FunctionalTool {
  constructor(private toolset: SkillToolset) {
    super({
      name: 'load_skill_resource',
      description:
        'Loads a resource file (from references/, assets/, or scripts/) from within a skill.',
      params: {
        type: Type.OBJECT,
        properties: {
          skill_name: {
            type: Type.STRING,
            description: 'The name of the skill.',
          },
          path: {
            type: Type.STRING,
            description:
              "The relative path to the resource (e.g., 'references/my_doc.md', 'assets/template.txt', or 'scripts/setup.sh').",
          },
        },
        required: ['skill_name', 'path'],
      },
      output: {
        type: Type.OBJECT,
      },
      execute: async (args: unknown) => {
        const typedArgs = args as Record<string, string>;
        const skillName = typedArgs['skill_name'];
        let resourcePath = typedArgs['path'];

        if (!skillName) {
          return {
            error: 'Skill name is required.',
            error_code: 'MISSING_SKILL_NAME',
          };
        }
        if (!resourcePath) {
          return {
            error: 'Resource path is required.',
            error_code: 'MISSING_RESOURCE_PATH',
          };
        }

        resourcePath = path.posix.normalize(resourcePath);

        const skill = this.toolset.getSkill(skillName);
        if (!skill) {
          return {
            error: `Skill '${skillName}' not found.`,
            error_code: 'SKILL_NOT_FOUND',
          };
        }

        let content: string | Buffer | undefined;
        const skillResources = skill.resources || {};

        if (resourcePath.startsWith('references/')) {
          const refName = resourcePath.substring('references/'.length);
          content = skillResources.references?.[refName];
        } else if (resourcePath.startsWith('assets/')) {
          const assetName = resourcePath.substring('assets/'.length);
          content = skillResources.assets?.[assetName];
        } else if (resourcePath.startsWith('scripts/')) {
          const scriptName = resourcePath.substring('scripts/'.length);
          const script = skillResources.scripts?.[scriptName];
          if (script) {
            content = script.src;
          }
        } else {
          return {
            error:
              "Path must start with 'references/', 'assets/', or 'scripts/'.",
            error_code: 'INVALID_RESOURCE_PATH',
          };
        }

        if (content === undefined) {
          return {
            error: `Resource '${resourcePath}' not found in skill '${skillName}'.`,
            error_code: 'RESOURCE_NOT_FOUND',
          };
        }

        if (Buffer.isBuffer(content)) {
          return {
            skill_name: skillName,
            path: resourcePath,
            status: BINARY_FILE_DETECTED_MSG,
          };
        }

        return {
          skill_name: skillName,
          path: resourcePath,
          content,
        };
      },
    });
  }

  override async processLlmRequest(
    request: LlmRequest,
  ): Promise<LlmRequest | undefined> {
    if (!request.contents || request.contents.length === 0) {
      return request;
    }

    const lastContent = request.contents[request.contents.length - 1];
    if (lastContent.role !== ContentRole.USER || !lastContent.parts) {
      return;
    }

    for (const part of lastContent.parts) {
      if (isFunctionResponseContentPart(part) && part.name === this.name) {
        const response = (part.response as Record<string, unknown>) || {};
        if (response['status'] === BINARY_FILE_DETECTED_MSG) {
          const skillName = response['skill_name'] as string;
          const resourcePath = response['path'] as string;

          const skill = this.toolset.getSkill(skillName);
          if (!skill) continue;
          const skillResources = skill.resources || {};

          let content: string | Buffer | undefined;
          if (resourcePath.startsWith('references/')) {
            content =
              skillResources.references?.[
                resourcePath.substring('references/'.length)
              ];
          } else if (resourcePath.startsWith('assets/')) {
            content =
              skillResources.assets?.[resourcePath.substring('assets/'.length)];
          }

          if (Buffer.isBuffer(content)) {
            const mimeType = guessMimeType(resourcePath);
            request.contents.push({
              role: ContentRole.USER,
              parts: [
                {
                  type: 'text',
                  text: `The content of binary file '${resourcePath}' is:`,
                },
                {
                  type: 'media',
                  data: content.toString('base64'),
                  mimeType: mimeType,
                },
              ],
            });
          }
        }
      }
    }

    return request;
  }
}
