import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'success'
    | 'warning';
}

export function Badge({
  children,
  variant = 'default',
  style,
  ...props
}: BadgeProps) {
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

  return (
    <span style={{ ...getStyles(), ...style }} {...props}>
      {children}
    </span>
  );
}
