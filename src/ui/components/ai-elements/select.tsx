import {ChevronDown} from 'lucide-react';
import React, {createContext, useContext, useState} from 'react';

interface SelectContextProps {
  value: string;
  onValueChange: (val: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextProps | undefined>(undefined);

export function Select({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value: string;
  onValueChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SelectContext.Provider value={{value, onValueChange, isOpen, setIsOpen}}>
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          minWidth: '180px',
        }}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({children}: {children: React.ReactNode}) {
  const context = useContext(SelectContext);
  if (!context) return null;

  return (
    <button
      onClick={() => context.setIsOpen(!context.isOpen)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: '#171717',
        border: '1px solid #262626',
        color: '#fafafa',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        outline: 'none',
      }}>
      {children}
      <ChevronDown size={16} style={{marginLeft: '8px', opacity: 0.7}} />
    </button>
  );
}

export function SelectValue({
  placeholder,
  children,
}: {
  placeholder?: string;
  children: React.ReactNode;
}) {
  return <span>{children || placeholder}</span>;
}

export function SelectContent({children}: {children: React.ReactNode}) {
  const context = useContext(SelectContext);
  if (!context || !context.isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        width: '100%',
        background: '#171717',
        border: '1px solid #262626',
        borderRadius: '0.375rem',
        boxShadow:
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: 9999,
        overflow: 'hidden',
      }}>
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const context = useContext(SelectContext);
  if (!context) return null;

  const isSelected = context.value === value;

  return (
    <div
      onClick={() => {
        context.onValueChange(value);
        context.setIsOpen(false);
      }}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        color: isSelected ? '#fafafa' : '#a3a3a3',
        background: isSelected ? '#262626' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#262626')}
      onMouseLeave={(e) =>
        isSelected ? null : (e.currentTarget.style.background = 'transparent')
      }>
      {children}
    </div>
  );
}
