import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from '@/components/ai-elements/artifact';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@/components/ai-elements/code-block';
import {Message, MessageContent} from '@/components/ai-elements/message';
import {
  ContentRole,
  getFileExtension,
  getMimeTypeAndEncoding,
} from '@agent007/core';
import {Copy, FileCode} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {ArtifactChatMessage} from '../../chat/chat_message';

interface ArtifactMessageProps {
  msg: ArtifactChatMessage;
}

export function ArtifactMessage({msg}: ArtifactMessageProps) {
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getLanguageFromMimeType = (mimeType?: string) => {
    if (!mimeType) return '';
    const clean = mimeType.toLowerCase();
    if (clean.includes('javascript') || clean.includes('js'))
      return 'javascript';
    if (clean.includes('typescript') || clean.includes('ts'))
      return 'typescript';
    if (clean.includes('python')) return 'python';
    if (clean.includes('markdown') || clean.includes('md')) return 'markdown';
    if (clean.includes('html')) return 'html';
    if (clean.includes('css')) return 'css';
    if (clean.includes('json')) return 'json';
    if (clean.includes('xml')) return 'xml';
    if (clean.includes('yaml') || clean.includes('yml')) return 'yaml';
    if (clean.includes('shell') || clean.includes('sh')) return 'shell';
    if (clean.includes('powershell')) return 'powershell';

    const slashIndex = clean.indexOf('/');
    if (slashIndex !== -1) {
      return clean.substring(slashIndex + 1).replace(/^x-/, '');
    }
    return clean;
  };

  return (
    <Message from={msg.author === ContentRole.USER ? 'user' : 'assistant'}>
      <MessageContent>
        {msg.items?.map((item, index) => {
          const mimeType =
            item.mimeType ||
            getMimeTypeAndEncoding(getFileExtension(item.filePath)).mimeType;
          const language = getLanguageFromMimeType(mimeType);
          const isCode =
            !!language || (mimeType && mimeType.startsWith('text/'));

          return (
            <Artifact key={index} style={{marginBottom: '16px'}}>
              <ArtifactHeader>
                <ArtifactTitle
                  style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <FileCode size={18} style={{color: '#00f2fe'}} />
                  {item.title}
                </ArtifactTitle>
                {item.description && (
                  <ArtifactDescription>{item.description}</ArtifactDescription>
                )}
                <ArtifactActions>
                  <ArtifactAction
                    tooltip="Copy Content"
                    icon={<Copy size={16} />}
                    onClick={() => handleCopy(item.content)}
                  />
                </ArtifactActions>
              </ArtifactHeader>
              <ArtifactContent style={{padding: isCode ? '0' : '20px'}}>
                {isCode ? (
                  <CodeBlock code={item.content} language={language}>
                    <CodeBlockHeader style={{display: 'none'}}>
                      <CodeBlockTitle>
                        <CodeBlockFilename>{item.title}</CodeBlockFilename>
                      </CodeBlockTitle>
                      <CodeBlockActions>
                        <CodeBlockCopyButton code={item.content} />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                  </CodeBlock>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.content}
                  </ReactMarkdown>
                )}
              </ArtifactContent>
            </Artifact>
          );
        })}
      </MessageContent>
    </Message>
  );
}
