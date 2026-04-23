import {ChevronDown, ChevronRight, File, Folder} from 'lucide-react';
import React, {useState} from 'react';

export interface FileTreeProps {
  children: React.ReactNode;
}

export function FileTree({children}: FileTreeProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '0.5rem 0',
        fontFamily: "'Inter', sans-serif",
      }}>
      {children}
    </div>
  );
}

export interface FolderProps {
  name: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function FolderItem({name, defaultOpen = false, children}: FolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.5rem',
          borderRadius: '0.375rem',
          background: 'transparent',
          border: 'none',
          color: '#a3a3a3',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#171717';
          e.currentTarget.style.color = '#e5e5e5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#a3a3a3';
        }}>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Folder size={14} style={{color: '#00f2fe'}} />
        <span style={{userSelect: 'none'}}>{name}</span>
      </button>
      {isOpen && (
        <div
          style={{
            paddingLeft: '1.25rem',
            borderLeft: '1px solid #262626',
            marginLeft: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface FileProps {
  name: string;
}

export function FileItem({name}: FileProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.5rem',
        borderRadius: '0.375rem',
        color: '#e5e5e5',
        fontSize: '0.875rem',
        fontWeight: 400,
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#171717';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}>
      <File size={14} style={{color: '#737373', marginLeft: '14px'}} />
      <span style={{userSelect: 'none'}}>{name}</span>
    </div>
  );
}
