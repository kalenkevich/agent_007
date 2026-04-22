import {Bot, User} from 'lucide-react';
import React from 'react';

export interface MessageProps {
  children: React.ReactNode;
  from: 'user' | 'assistant';
  className?: string;
}

export function Message({children, from, className}: MessageProps) {
  return (
    <div
      className={`message ${from === 'user' ? 'user-messsage' : 'system-messsage'} ${className || ''}`}
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '1rem',
        alignItems: 'flex-start',
      }}>
      <div
        className="avatar"
        style={{
          paddingTop: '4px',
          userSelect: 'none',
        }}>
        {from === 'user' ? (
          <User size={20} style={{color: '#a3a3a3'}} />
        ) : (
          <Bot size={20} style={{color: '#00f2fe'}} />
        )}
      </div>
      <div
        className="messsage-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
        {children}
      </div>
    </div>
  );
}

export function MessageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`markdown-content ${className || ''}`}
      style={{
        color: '#e5e5e5',
        lineHeight: 1.6,
        fontSize: '0.95rem',
      }}>
      {children}
    </div>
  );
}

export function MessageResponse({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
