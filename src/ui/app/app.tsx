import {
  ContentRole,
  isUserInputRequestEvent,
  type AgentEvent,
  type SessionMetadata,
} from '@agent007/core';
import {useEffect, useRef, useState} from 'react';
import {agentClient} from '../agent/agent_client';
import {ChatMessageType, type ChatMessage} from '../chat/chat_message';
import {type ChatState} from '../chat/chat_state';
import {processEvent} from '../chat/event_processor';
import {Sidebar} from '../components/Sidebar';
import {ChatHeader} from '../components/ChatHeader';
import {MessageList} from '../components/MessageList';
import {ChatInput} from '../components/ChatInput';
import {ConfirmationDialog} from '../components/ConfirmationDialog';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingUserInput, setPendingUserInput] = useState<AgentEvent | null>(
    null,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    undefined,
  );
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const messageStreamRef = useRef<HTMLDivElement>(null);
  const activeStreamMessageIdRef = useRef<string | null>(null);

  const chatStateRef = useRef<ChatState>({
    messages,
    isLoading,
    isThinking,
    pendingUserInput,
    activeStreamMessageId: activeStreamMessageIdRef.current || undefined,
  });

  chatStateRef.current = {
    messages,
    isLoading,
    isThinking,
    pendingUserInput,
    activeStreamMessageId: activeStreamMessageIdRef.current || undefined,
  };

  useEffect(() => {
    // Scroll to bottom when messages update
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTo({
        top: messageStreamRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    // Set up event listener for agent responses
    agentClient.onAgentEvent((event: AgentEvent) => {
      const newState = processEvent(chatStateRef.current, event);

      setMessages(newState.messages);
      setIsLoading(newState.isLoading);
      setIsThinking(newState.isThinking);
      setPendingUserInput(newState.pendingUserInput);
      activeStreamMessageIdRef.current = newState.activeStreamMessageId || null;
    });

    agentClient.initSession().then((res) => {
      if (res && !res.success && res.needApiKey) {
        setShowApiKeyPrompt(true);
      } else if (res && res.success && res.sessionId) {
        setActiveSessionId(res.sessionId);
        agentClient.getSessions().then((sessionRes) => {
          if (sessionRes.success && sessionRes.sessions) {
            setSessions(sessionRes.sessions);
          }
        });
      }
    });
  }, []);

  const appendMessage = (content: string, isUser: boolean) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        invocationId: 'user-invocation',
        author: isUser ? ContentRole.USER : ContentRole.AGENT,
        type: ChatMessageType.TEXT,
        content,
        completed: true,
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

  const handleUserInputResponse = async (action: string) => {
    if (!pendingUserInput || !isUserInputRequestEvent(pendingUserInput)) return;

    const req = pendingUserInput;
    setPendingUserInput(null);

    appendMessage(`User answered: ${action}`, true);

    try {
      await agentClient.sendUserInputResponse(
        req.requestId,
        action as 'accept' | 'decline' | 'cancel',
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleSubmitApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      const res = await agentClient.submitApiKey(apiKeyInput.trim());
      if (res.success) {
        setShowApiKeyPrompt(false);
        const initRes = await agentClient.initSession();
        if (!initRes.success) {
          appendMessage(`Error initializing session: ${initRes.error}`, false);
        }
      } else {
        appendMessage(`Error saving API key: ${res.error}`, false);
      }
    } catch (err) {
      appendMessage(`Error: ${err}`, false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const res = await agentClient.selectSession(sessionId);
      if (res.success && res.session) {
        let state: ChatState = {
          messages: [],
          isLoading: false,
          isThinking: false,
          pendingUserInput: null,
          activeStreamMessageId: undefined,
        };

        for (const ev of res.session.events) {
          state = processEvent(state, ev);
        }

        setMessages(state.messages);
        setIsLoading(state.isLoading);
        setIsThinking(state.isThinking);
        setPendingUserInput(state.pendingUserInput);
        activeStreamMessageIdRef.current = state.activeStreamMessageId || null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setDeleteSessionId(sessionId);
  };

  const handleConfirmDelete = async (sessionId: string) => {
    try {
      const res = await agentClient.deleteSession(sessionId);
      if (res.success) {
        const sessionRes = await agentClient.getSessions();
        if (sessionRes.success && sessionRes.sessions) {
          setSessions(sessionRes.sessions);
        }

        if (sessionId === activeSessionId) {
          setActiveSessionId(undefined);
          setMessages([]);
          setPendingUserInput(null);
          setIsThinking(false);
          setIsLoading(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleNewSession = async () => {
    setActiveSessionId(undefined);
    setMessages([]);
    try {
      const res = await agentClient.startNewSession();
      if (res.success) {
        const sessionRes = await agentClient.getSessions();
        if (sessionRes.success && sessionRes.sessions) {
          setSessions(sessionRes.sessions);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

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
          <ChatHeader session={sessions.find((s) => s.id === activeSessionId)} />

          <MessageList messages={messages} messageStreamRef={messageStreamRef} />

          <ChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSend={handleSend}
            showApiKeyPrompt={showApiKeyPrompt}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            handleSubmitApiKey={handleSubmitApiKey}
            pendingUserInput={pendingUserInput}
            handleUserInputResponse={handleUserInputResponse}
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
