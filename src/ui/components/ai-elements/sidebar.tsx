import React from 'react';

export interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={`sidebar ${className || ''}`}
      style={{
        width: '260px',
        height: '100vh',
        background: '#0a0a0a',
        borderRight: '1px solid #262626',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '1rem',
        borderBottom: '1px solid #262626',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '1rem',
        borderTop: '1px solid #262626',
        marginTop: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#737373',
        padding: '0 0.5rem',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {children}
    </div>
  );
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SidebarMenuButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: active ? '#fafafa' : '#a3a3a3',
        background: active ? '#262626' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#171717';
          e.currentTarget.style.color = '#e5e5e5';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#a3a3a3';
        }
      }}
    >
      {children}
    </button>
  );
}
