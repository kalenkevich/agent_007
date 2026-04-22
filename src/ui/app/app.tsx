import {
  ContentRole,
  type AgentEvent,
  type SessionMetadata,
  AgentEventType,
  UserInputAction,
  ToolExecutionPolicyType,
} from '@agent007/core';
import {useEffect, useRef, useState} from 'react';
import {agentClient} from '../agent/agent_client';
import {ChatMessageType, type ChatMessage} from '../chat/chat_message';
import {type ChatState} from '../chat/chat_state';
import {processEvent} from '../chat/event_processor';
import {ChatHeader} from '../components/ChatHeader';
import {ChatInput} from '../components/ChatInput';
import {ConfirmationDialog} from '../components/ConfirmationDialog';
import {MessageList} from '../components/MessageList';
import {Sidebar} from '../components/Sidebar';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    undefined,
  );
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const handleToolPolicyChange = async (policyType: string) => {
    try {
      await agentClient.updateToolExecutionPolicy({
        type: policyType as ToolExecutionPolicyType,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const messageStreamRef = useRef<HTMLDivElement>(null);
  const activeStreamMessageIdRef = useRef<string | null>(null);

  const chatStateRef = useRef<ChatState>({
    messages,
    isLoading,
    isThinking,
    activeStreamMessageId: activeStreamMessageIdRef.current || undefined,
  });

  chatStateRef.current = {
    messages,
    isLoading,
    isThinking,
    activeStreamMessageId: activeStreamMessageIdRef.current || undefined,
  };

  useEffect(() => {
    // Scroll to bottom when messages or loading state update
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTo({
        top: messageStreamRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const appendMessage = (content: string, isUser: boolean) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        invocationId: 'user-invocation',
        author: isUser ? ContentRole.USER : ContentRole.AGENT,
        type: ChatMessageType.TEXT,
        content,
        final: true,
      },
    ]);
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendMessage(trimmed, true);
    setInputValue('');

    try {
      if (trimmed.startsWith('/plan')) {
        const task = trimmed.substring(5).trim();
        await agentClient.sendPlan(task);
      } else {
        await agentClient.sendUserInput(trimmed);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleUserInputResponse = async (requestId: string, action: UserInputAction) => {
    appendMessage(`User answered: ${action}`, true);

    try {
      await agentClient.sendUserInputResponse(
        requestId,
        action,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleSubmitApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      setIsLoading(true);
      const res = await agentClient.submitApiKey(apiKeyInput.trim());
      if (res.success) {
        setShowApiKeyPrompt(false);
        const initRes = await agentClient.initSession();
        if (!initRes.success) {
          appendMessage(`Error initializing session: ${initRes.error}`, false);
          setIsLoading(false);
        } else if (initRes.sessionId) {
          handleSelectSession(initRes.sessionId);
        }
      } else {
        appendMessage(`Error saving API key: ${res.error}`, false);
        setIsLoading(false);
      }
    } catch (err) {
      appendMessage(`Error: ${err}`, false);
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setIsLoading(true);
    setActiveSessionId(sessionId);
    try {
      const res = await agentClient.selectSession(sessionId);
      if (res.success && res.session) {
        let state: ChatState = {
          messages: [],
          isLoading: false,
          isThinking: false,
          activeStreamMessageId: undefined,
        };

        for (const ev of res.session.events) {
          state = processEvent(state, ev);
        }

        setMessages(state.messages);
        setIsLoading(state.isLoading);
        setIsThinking(state.isThinking);
        activeStreamMessageIdRef.current = state.activeStreamMessageId || null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up event listener for agent responses
    agentClient.onAgentEvent((event: AgentEvent) => {
      if (event.type === AgentEventType.UPDATE_TOOL_EXECUTION_POLICY) {
        agentClient.getSessions().then((sessionRes) => {
          if (sessionRes.success && sessionRes.sessions) {
            setSessions(sessionRes.sessions);
          }
        });
      }

      const newState = processEvent(chatStateRef.current, event);

      setMessages(newState.messages);
      setIsLoading(newState.isLoading);
      setIsThinking(newState.isThinking);
      activeStreamMessageIdRef.current = newState.activeStreamMessageId || null;
    });

    agentClient.onSessionMetadataChange((metadata: SessionMetadata) => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => (s.id === metadata.id ? metadata : s)),
      );
    });

    agentClient.initSession().then((res) => {
      if (res && !res.success && res.needApiKey) {
        setShowApiKeyPrompt(true);
      } else if (res && res.success && res.sessionId) {
        handleSelectSession(res.sessionId);
        agentClient.getSessions().then((sessionRes) => {
          if (sessionRes.success && sessionRes.sessions) {
            setSessions(sessionRes.sessions);
          }
        });
      }
    });
  }, []);

  const handleDeleteSession = (sessionId: string) => {
    setDeleteSessionId(sessionId);
  };

  const handleConfirmDelete = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const res = await agentClient.deleteSession(sessionId);
      if (res.success) {
        const sessionRes = await agentClient.getSessions();
        if (sessionRes.success && sessionRes.sessions) {
          setSessions(sessionRes.sessions);
        }

        if (sessionId === activeSessionId) {
          setActiveSessionId(undefined);
          setMessages([]);
          setIsThinking(false);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
    setIsLoading(true);
    setActiveSessionId(undefined);
    setMessages([]);
    try {
      const res = await agentClient.startNewSession();
      if (res.success) {
        const currentRes = await agentClient.getCurrentSession();
        if (currentRes.success && currentRes.session) {
          handleSelectSession(currentRes.session.id);
        }
        const sessionRes = await agentClient.getSessions();
        if (sessionRes.success && sessionRes.sessions) {
          setSessions(sessionRes.sessions);
        }
      }
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
      setIsLoading(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const toolPolicy =
    activeSession?.toolExecutionPolicy?.type ??
    ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION;

  return (
    <>
      {/* Draggable title bar for desktop window */}
      <div className="titlebar">
        <div className="titlebar-label">Agent 007 Workspace</div>
      </div>

      {/* Dynamic Background Orbs */}
      <div className="orb orb-primary"></div>
      <div className="orb orb-secondary"></div>

      <div className="app-container">
        <Sidebar
          sessions={sessions}
          isLoading={isLoading}
          isThinking={isThinking}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          activeSessionId={activeSessionId}
        />

        <main className="chat-area">
          <ChatHeader
            session={activeSession}
            toolPolicy={toolPolicy}
            onToolPolicyChange={handleToolPolicyChange}
          />

          <MessageList
            messages={messages}
            isLoading={isLoading}
            messageStreamRef={messageStreamRef}
            onUserInputResponse={handleUserInputResponse}
          />

          <ChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSend={handleSend}
            showApiKeyPrompt={showApiKeyPrompt}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            handleSubmitApiKey={handleSubmitApiKey}
          />
        </main>
      </div>

      <ConfirmationDialog
        isOpen={!!deleteSessionId}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        onConfirm={async () => {
          if (deleteSessionId) {
            await handleConfirmDelete(deleteSessionId);
            setDeleteSessionId(null);
          }
        }}
        onCancel={() => setDeleteSessionId(null)}
      />
    </>
  );
}
