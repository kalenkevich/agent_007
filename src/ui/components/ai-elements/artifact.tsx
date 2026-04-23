import {X} from 'lucide-react';
import React from 'react';
import {Tooltip} from './tooltip';

export interface ArtifactProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Artifact({
  children,
  style,
  className,
  ...props
}: ArtifactProps) {
  return (
    <div
      className={`artifact-component ${className || ''}`}
      style={{
        background: '#0a0a0a',
        border: '1px solid #262626',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        marginBottom: '16px',
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
}

export interface ArtifactHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ArtifactHeader({
  children,
  style,
  className,
  ...props
}: ArtifactHeaderProps) {
  return (
    <div
      className={`artifact-header ${className || ''}`}
      style={{
        borderBottom: '1px solid #262626',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: '#0f0f0f',
        ...style,
      }}
      {...props}>
      <div
        style={{display: 'flex', flexDirection: 'column', gap: '4px', flex: 1}}>
        {children}
      </div>
    </div>
  );
}

export interface ArtifactTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function ArtifactTitle({
  children,
  style,
  className,
  ...props
}: ArtifactTitleProps) {
  return (
    <h3
      className={`artifact-title ${className || ''}`}
      style={{
        margin: 0,
        fontSize: '0.95rem',
        fontWeight: 600,
        color: '#f3f4f6',
        letterSpacing: '0.2px',
        ...style,
      }}
      {...props}>
      {children}
    </h3>
  );
}

export interface ArtifactDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function ArtifactDescription({
  children,
  style,
  className,
  ...props
}: ArtifactDescriptionProps) {
  return (
    <p
      className={`artifact-description ${className || ''}`}
      style={{
        margin: 0,
        fontSize: '0.8rem',
        color: '#9ca3af',
        ...style,
      }}
      {...props}>
      {children}
    </p>
  );
}

export interface ArtifactActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ArtifactActions({
  children,
  style,
  className,
  ...props
}: ArtifactActionsProps) {
  return (
    <div
      className={`artifact-actions ${className || ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
}

export interface ArtifactActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
  label?: string;
  icon?: React.ReactNode;
}

export function ArtifactAction({
  tooltip,
  label,
  icon,
  style,
  className,
  children,
  ...props
}: ArtifactActionProps) {
  const button = (
    <button
      className={`artifact-action ${className || ''}`}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        padding: '6px 10px',
        color: '#d1d5db',
        fontSize: '0.8rem',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s ease-in-out',
        ...style,
      }}
      {...props}>
      {icon && <span style={{display: 'inline-flex'}}>{icon}</span>}
      {label && <span>{label}</span>}
      {children}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
}

export interface ArtifactCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function ArtifactClose({
  style,
  className,
  ...props
}: ArtifactCloseProps) {
  return (
    <button
      className={`artifact-close ${className || ''}`}
      style={{
        background: 'none',
        border: 'none',
        padding: '4px',
        color: '#9ca3af',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        transition: 'color 0.15s ease-in-out',
        ...style,
      }}
      {...props}>
      <X size={18} />
    </button>
  );
}

export interface ArtifactContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ArtifactContent({
  children,
  style,
  className,
  ...props
}: ArtifactContentProps) {
  return (
    <div
      className={`artifact-content ${className || ''}`}
      style={{
        padding: '20px',
        overflowY: 'auto',
        maxHeight: '600px',
        background: '#0c0c0c',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
}
