import {Tooltip} from '@/components/ai-elements/tooltip';
import {OctagonX, Send} from 'lucide-react';
import React from 'react';

export interface PromptInputProps {
  children: React.ReactNode;
  onSubmit?: () => void;
  className?: string;
}

export interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface PromptInputSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: 'ready' | 'streaming' | 'submitted';
}

export function PromptInput({children, onSubmit, className}: PromptInputProps) {
  return (
    <div
      className={`prompt-input-container ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
      }}>
      {children}
    </div>
  );
}

export function PromptInputTextarea(props: PromptInputTextareaProps) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        minHeight: '60px',
        resize: 'none',
        background: '#171717',
        border: '1px solid #262626',
        borderRadius: '0.375rem',
        padding: '0.75rem',
        color: '#e5e5e5',
        fontSize: '0.95rem',
        fontFamily: 'inherit',
        outline: 'none',
        lineHeight: '1.5',
        ...props.style,
      }}
    />
  );
}

export function PromptInputSubmit({
  status = 'ready',
  ...props
}: PromptInputSubmitProps) {
  const tooltipText =
    status === 'streaming'
      ? 'Abort current execution'
      : 'Send command to agent';

  return (
    <Tooltip content={tooltipText}>
      <button
        {...props}
        style={{
          background: status === 'streaming' ? '#ef4444' : '#1e3a8a',
          color: '#ffffff',
          border: 'none',
          padding: '0.5rem 1.5rem',
          borderRadius: '0.375rem',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          height: '38px',
          transition: 'background 0.15s',
          ...props.style,
        }}>
        {status === 'streaming' ? (
          <>
            <OctagonX size={16} />
          </>
        ) : (
          <>
            <Send size={16} />
          </>
        )}
      </button>
    </Tooltip>
  );
}
