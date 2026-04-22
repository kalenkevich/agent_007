import React, {createContext, useContext, useEffect, useState} from 'react';

interface CollapsibleContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextProps | undefined>(
  undefined,
);

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  style,
  ...props
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(controlledOpen ?? defaultOpen);

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
    <CollapsibleContext.Provider
      value={{open: isOpen, setOpen: handleOpenChange}}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...style,
        }}
        {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

import {ChevronsDownUp, ChevronsUpDown} from 'lucide-react';

export function CollapsibleTrigger({
  children,
  style,
  onClick,
  ...props
}: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(
      'CollapsibleTrigger must be used within a Collapsible component',
    );
  }

  return (
    <button
      onClick={(e) => {
        context.setOpen(!context.open);
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
        gap: '6px',
        color: '#9ca3af',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
        userSelect: 'none',
        ...style,
      }}
      {...props}>
      {context.open ? (
        <ChevronsDownUp size={16} style={{flexShrink: 0}} />
      ) : (
        <ChevronsUpDown size={16} style={{flexShrink: 0}} />
      )}
      {children}
    </button>
  );
}

export interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CollapsibleContent({
  children,
  style,
  ...props
}: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error(
      'CollapsibleContent must be used within a Collapsible component',
    );
  }

  if (!context.open) return null;

  return (
    <div
      style={{
        paddingTop: '8px',
        transition: 'all 0.3s ease-in-out',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
}
