import {Tooltip} from '@/components/ai-elements/tooltip';
import {Check, ShieldAlert, X} from 'lucide-react';
import React, {createContext, useContext} from 'react';

export interface ConfirmationProps {
  children: React.ReactNode;
  state: 'approval-requested' | 'approval-responded' | 'output-denied';
  className?: string;
}

const ConfirmationContext = createContext<
  'approval-requested' | 'approval-responded' | 'output-denied'
>('approval-requested');

export function Confirmation({children, state, className}: ConfirmationProps) {
  return (
    <ConfirmationContext.Provider value={state}>
      <div
        className={`confirmation-container ${className || ''}`}
        style={{
          background: '#0a0a0a',
          border: '1px solid #262626',
          borderLeft:
            state === 'approval-requested'
              ? '4px solid #fcd34d'
              : state === 'approval-responded'
                ? '4px solid #22c55e'
                : '4px solid #ef4444',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          margin: '1rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxWidth: '100%',
          boxShadow:
            '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        }}>
        {children}
      </div>
    </ConfirmationContext.Provider>
  );
}

export function ConfirmationTitle({children}: {children: React.ReactNode}) {
  return (
    <div
      style={{
        fontWeight: 600,
        fontSize: '0.9rem',
        color: '#fafafa',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
      <ShieldAlert size={16} style={{color: '#fcd34d'}} />
      {children}
    </div>
  );
}

export function ConfirmationRequest({children}: {children: React.ReactNode}) {
  const state = useContext(ConfirmationContext);
  if (state !== 'approval-requested') return null;

  return (
    <div
      style={{
        padding: '12px',
        background: '#171717',
        borderRadius: '0.375rem',
        fontSize: '0.95rem',
        border: '1px solid #262626',
        color: '#e5e5e5',
        lineHeight: 1.6,
      }}>
      {children}
    </div>
  );
}

export function ConfirmationAccepted({children}: {children: React.ReactNode}) {
  const state = useContext(ConfirmationContext);
  if (state !== 'approval-responded') return null;

  return (
    <div
      style={{
        padding: '12px',
        background: '#052e16',
        color: '#86efac',
        borderRadius: '0.375rem',
        fontSize: '0.95rem',
        border: '1px solid #15803d',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
      <Check size={16} />
      {children}
    </div>
  );
}

export function ConfirmationRejected({children}: {children: React.ReactNode}) {
  const state = useContext(ConfirmationContext);
  if (state !== 'output-denied') return null;

  return (
    <div
      style={{
        padding: '12px',
        background: '#451a03',
        color: '#fcd34d',
        borderRadius: '0.375rem',
        fontSize: '0.95rem',
        border: '1px solid #b45309',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
      <X size={16} />
      {children}
    </div>
  );
}

export function ConfirmationActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const state = useContext(ConfirmationContext);
  if (state !== 'approval-requested') return null;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '12px',
        marginTop: '12px',
      }}>
      {children}
    </div>
  );
}

export function ConfirmationAction({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline';
}) {
  const tooltipContent =
    variant === 'default' ? 'Approve this action' : 'Decline this action';

  return (
    <Tooltip content={tooltipContent}>
      <button
        onClick={onClick}
        style={{
          flex: 1,
          background: variant === 'default' ? '#1e3a8a' : 'transparent',
          color: variant === 'default' ? '#ffffff' : '#d1d5db',
          border:
            variant === 'default'
              ? '1px solid #1d4ed8'
              : '1px solid rgba(255, 255, 255, 0.2)',
          padding: '8px',
          borderRadius: '0.375rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          width: '100%',
        }}>
        {children}
      </button>
    </Tooltip>
  );
}
