import {Wrench} from 'lucide-react';
import React from 'react';

export interface ToolProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export interface ToolHeaderProps {
  title?: string;
  type: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error'
    | 'output-denied';
  toolName?: string;
  className?: string;
}

export interface ToolContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface ToolInputProps {
  input?: Record<string, unknown>;
  className?: string;
}

export interface ToolOutputProps {
  output?: React.ReactNode;
  errorText?: string;
  className?: string;
}

// Abstraction of shadcn/ui Badge
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'success'
    | 'warning';
}) {
  const getStyles = () => {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '9999px',
      border: '1px solid transparent',
      padding: '3px 10px',
      fontSize: '0.75rem',
      fontWeight: 600,
      transition: 'colors 0.15s ease-in-out',
      letterSpacing: '0.5px',
      userSelect: 'none' as const,
    };

    switch (variant) {
      case 'destructive':
        return {
          ...base,
          background: '#7f1d1d',
          color: '#fca5a5',
          borderColor: '#b91c1c',
        };
      case 'secondary':
        return {
          ...base,
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#d1d5db',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        };
      case 'success':
        return {
          ...base,
          background: '#052e16',
          color: '#86efac',
          borderColor: '#15803d',
        };
      case 'warning':
        return {
          ...base,
          background: '#451a03',
          color: '#fcd34d',
          borderColor: '#b45309',
        };
      case 'outline':
        return {
          ...base,
          background: 'transparent',
          color: '#f3f4f6',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      default:
        return {
          ...base,
          background: '#1e3a8a',
          color: '#93c5fd',
          borderColor: '#1d4ed8',
        };
    }
  };

  return <span style={getStyles()}>{children}</span>;
}

export const getStatusBadge = (state: ToolHeaderProps['state']) => {
  switch (state) {
    case 'input-streaming':
      return <Badge variant="secondary">⏳ Pending</Badge>;
    case 'input-available':
      return <Badge variant="default">⚙️ Running</Badge>;
    case 'approval-requested':
      return <Badge variant="warning">✋ Awaiting Approval</Badge>;
    case 'approval-responded':
      return <Badge variant="outline">👌 Responded</Badge>;
    case 'output-available':
      return <Badge variant="success">✅ Completed</Badge>;
    case 'output-error':
      return <Badge variant="destructive">❌ Error</Badge>;
    case 'output-denied':
      return <Badge variant="destructive">🚫 Denied</Badge>;
    default:
      return <Badge variant="outline">🔧 {state}</Badge>;
  }
};

// Abstraction of shadcn/ui Accordion
export function Accordion({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} style={{cursor: 'pointer', width: '100%'}}>
      <summary
        style={{
          color: '#9ca3af',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginBottom: '8px',
          userSelect: 'none',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'color 0.2s',
        }}>
        <span style={{transition: 'transform 0.2s'}}>▼</span>
        {title}
      </summary>
      <div style={{cursor: 'auto', transition: 'all 0.3s ease-in-out'}}>
        {children}
      </div>
    </details>
  );
}

export function Tool({children, className}: ToolProps) {
  return (
    <div
      className={`tool-component ${className || ''}`}
      style={{
        background: '#0a0a0a',
        border: '1px solid #262626',
        borderRadius: '0.5rem',
        padding: '1.25rem',
        margin: '1rem 0',
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '100%',
      }}>
      {children}
    </div>
  );
}

export function ToolHeader({
  title,
  type,
  state,
  toolName,
  className,
}: ToolHeaderProps) {
  const badge = getStatusBadge(state);
  const displayName = title || toolName || type.replace('tool-', '');

  return (
    <div
      className={`tool-header ${className || ''}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #262626',
        paddingBottom: '0.75rem',
      }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
        <Wrench size={16} style={{color: '#3b82f6'}} />
        <span
          style={{
            fontWeight: 600,
            letterSpacing: '-0.025em',
            fontFamily: 'inherit',
            color: '#fafafa',
          }}>
          {displayName}
        </span>
      </div>
      <div>{badge}</div>
    </div>
  );
}

export function ToolContent({children, className}: ToolContentProps) {
  return (
    <div
      className={`tool-content ${className || ''}`}
      style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      {children}
    </div>
  );
}

export function ToolInput({input, className}: ToolInputProps) {
  if (!input || Object.keys(input).length === 0) return null;

  return (
    <Accordion title="Parameters">
      <pre
        style={{
          background: '#171717',
          border: '1px solid #262626',
          padding: '1rem',
          borderRadius: '0.375rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          overflowX: 'auto',
          color: '#e5e5e5',
          lineHeight: 1.6,
        }}>
        {JSON.stringify(input, null, 2)}
      </pre>
    </Accordion>
  );
}

export function ToolOutput({output, errorText, className}: ToolOutputProps) {
  if (!output && !errorText) return null;

  return (
    <Accordion title="Response">
      {errorText ? (
        <pre
          style={{
            background: 'rgba(127, 29, 29, 0.2)',
            border: '1px solid #ef4444',
            padding: '1rem',
            borderRadius: '0.375rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            overflowX: 'auto',
            color: '#fca5a5',
            lineHeight: 1.6,
          }}>
          {errorText}
        </pre>
      ) : (
        <div
          style={{
            background: '#171717',
            border: '1px solid #262626',
            padding: '1rem',
            borderRadius: '0.375rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            overflowX: 'auto',
            color: '#e5e5e5',
            lineHeight: 1.6,
          }}>
          {output}
        </div>
      )}
    </Accordion>
  );
}
