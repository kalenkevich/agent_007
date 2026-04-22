import React, {useState} from 'react';

export function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}>
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
            background: '#171717',
            border: '1px solid #262626',
            color: '#e5e5e5',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            boxShadow:
              '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}>
          {content}
        </div>
      )}
    </div>
  );
}
