import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ai-elements/sidebar';
import {Tooltip} from '@/components/ai-elements/tooltip';
import {type SessionMetadata} from '@agent007/core';
import {Folder, Plus, Trash2, File} from 'lucide-react';
import {FileTree, FolderItem, FileItem} from './ai-elements/file-tree';

function formatSessionTimestamp(timestamp: string): string {
  const now = new Date();
  const target = new Date(timestamp);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins <= 0) {
    return 'now';
  }

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isYesterday = (d1: Date, d2: Date) => {
    const yesterday = new Date(d1);
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      yesterday.getFullYear() === d2.getFullYear() &&
      yesterday.getMonth() === d2.getMonth() &&
      yesterday.getDate() === d2.getDate()
    );
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  if (isSameDay(now, target)) {
    return `today at ${formatTime(target)}`;
  }

  if (isYesterday(now, target)) {
    return `yesterday at ${formatTime(target)}`;
  }

  return target.toLocaleDateString();
}

interface SidebarProps {
  sessions: SessionMetadata[];
  isLoading: boolean;
  isThinking: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  activeSessionId?: string;
  workspaceFiles?: string[];
}

interface TreeNode {
  name: string;
  children?: Map<string, TreeNode>;
}

function buildTree(paths: string[]) {
  const root: TreeNode = {name: '', children: new Map()};

  for (const p of paths) {
    const parts = p.split('/');
    let current = root;
    for (const part of parts) {
      if (!current.children) {
        current.children = new Map();
      }
      if (!current.children.has(part)) {
        current.children.set(part, {name: part});
      }
      current = current.children.get(part)!;
    }
  }
  return root;
}

function renderTreeNode(node: TreeNode, keyPrefix = ''): React.ReactNode {
  if (!node.children || node.children.size === 0) {
    return <FileItem key={keyPrefix + node.name} name={node.name} />;
  }

  return (
    <FolderItem key={keyPrefix + node.name} name={node.name}>
      {Array.from(node.children.values()).map((child) =>
        renderTreeNode(child, keyPrefix + node.name + '/'),
      )}
    </FolderItem>
  );
}

export function Sidebar({
  sessions,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  activeSessionId,
  workspaceFiles = [],
}: SidebarProps) {
  return (
    <SidebarContainer>
      <SidebarHeader>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <div style={{fontSize: '1.5rem'}}>🤖</div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0,
              color: '#fafafa',
            }}>
            Agent<span style={{color: '#00f2fe'}}>007</span>
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenuButton onClick={onNewSession} active={false}>
            <Plus size={16} />
            <span>New Session</span>
          </SidebarMenuButton>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Active Sessions</SidebarGroupLabel>
          <SidebarMenu>
            {[...sessions]
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .map((session) => (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    active={session.id === activeSessionId}
                    onClick={() => onSelectSession(session.id)}>
                    <Folder size={16} />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflow: 'hidden',
                      }}>
                      <Tooltip
                        content={
                          session.title ||
                          `Session ${session.id.substring(0, 6)}`
                        }>
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                          {session.title ||
                            `Session ${session.id.substring(0, 6)}`}
                        </span>
                      </Tooltip>
                      <span style={{fontSize: '0.75rem', color: '#737373'}}>
                        {formatSessionTimestamp(session.timestamp)}
                      </span>
                    </div>
                    <Trash2
                      size={14}
                      style={{
                        marginLeft: 'auto',
                        color: '#737373',
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#ef4444')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = '#737373')
                      }
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace Files</SidebarGroupLabel>
          <FileTree>
            {workspaceFiles.length > 0 &&
              Array.from(
                buildTree(workspaceFiles).children?.values() || [],
              ).map((node) => renderTreeNode(node))}
          </FileTree>
        </SidebarGroup>
      </SidebarContent>
    </SidebarContainer>
  );
}
