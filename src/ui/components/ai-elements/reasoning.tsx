import {ChevronsDownUp, ChevronsUpDown} from 'lucide-react';
import React, {createContext, useContext, useEffect, useState} from 'react';

interface ReasoningContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming?: boolean;
  duration?: string;
}

const ReasoningContext = createContext<ReasoningContextProps | undefined>(
  undefined,
);

export function useReasoning() {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('useReasoning must be used within a Reasoning component');
  }
  return context;
}

export interface ReasoningProps extends React.HTMLAttributes<HTMLDivElement> {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: string;
  children: React.ReactNode;
}

export function Reasoning({
  isStreaming = false,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  duration,
  children,
  style,
  className,
  ...props
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(controlledOpen ?? defaultOpen);

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen);
    }
  }, [controlledOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <ReasoningContext.Provider
      value={{isOpen, setIsOpen: handleOpenChange, isStreaming, duration}}>
      <div
        className={`reasoning-component ${className || ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '10px 12px',
          marginBottom: '12px',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease-in-out',
          ...style,
        }}
        {...props}>
        {children}
      </div>
    </ReasoningContext.Provider>
  );
}

export interface ReasoningTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  getThinkingMessage?: (isStreaming?: boolean, duration?: string) => string;
}

export function ReasoningTrigger({
  getThinkingMessage,
  style,
  onClick,
  ...props
}: ReasoningTriggerProps) {
  const {isOpen, setIsOpen, isStreaming, duration} = useReasoning();

  const defaultGetMessage = (streaming?: boolean, dur?: string) => {
    if (streaming) return 'Thinking...';
    return dur ? `Thought for ${dur}` : 'Thought for a few seconds';
  };

  const message = getThinkingMessage
    ? getThinkingMessage(isStreaming, duration)
    : defaultGetMessage(isStreaming, duration);

  return (
    <button
      onClick={(e) => {
        setIsOpen(!isOpen);
        onClick?.(e);
      }}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        margin: 0,
        font: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        color: '#9ca3af',
        fontSize: '0.85rem',
        fontWeight: 500,
        letterSpacing: '0.4px',
        userSelect: 'none',
        ...style,
      }}
      {...props}>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        {isStreaming ? (
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00f2fe',
              animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        ) : (
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4b5563',
            }}
          />
        )}
        <span>{message}</span>
      </div>
      {isOpen ? (
        <ChevronsDownUp size={16} style={{color: '#6b7280'}} />
      ) : (
        <ChevronsUpDown size={16} style={{color: '#6b7280'}} />
      )}
    </button>
  );
}

export interface ReasoningContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ReasoningContent({
  children,
  style,
  ...props
}: ReasoningContentProps) {
  const {isOpen} = useReasoning();

  if (!isOpen) return null;

  return (
    <div
      style={{
        paddingTop: '10px',
        fontSize: '0.9rem',
        color: '#9ca3af',
        lineHeight: 1.6,
        fontStyle: 'italic',
        whiteSpace: 'pre-wrap',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
}
