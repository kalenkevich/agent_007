import {
  ContentRole,
  type AgentEvent,
  type SessionMetadata,
  AgentEventType,
  UserInputAction,
  ToolExecutionPolicyType,
} from '@agent007/core';
import {useEffect, useRef, useState} from 'react';
import {agentRunClient} from '../agent_run/agent_run_client';
import {ChatMessageType, type ChatMessage} from '../chat/chat_message';
import {type ChatState} from '../chat/chat_state';
import {processEvent} from '../chat/event_processor';
import {ChatHeader} from '../components/ChatHeader';
import {ChatInput} from '../components/ChatInput';
import {ConfirmationDialog} from '../components/ConfirmationDialog';
import {MessageList} from '../components/message/MessageList';
import {Sidebar} from '../components/Sidebar';
import { dialogService } from '../components/DialogService';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [usage, setUsage] = useState<ChatState['usage']>(undefined);

  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    undefined,
  );
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');


  const handleToolPolicyChange = async (policyType: string) => {
    try {
      await agentRunClient.updateToolExecutionPolicy({
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
    usage,
  });

  chatStateRef.current = {
    messages,
    isLoading,
    isThinking,
    activeStreamMessageId: activeStreamMessageIdRef.current || undefined,
    usage,
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
        await agentRunClient.sendPlan(task);
      } else {
        await agentRunClient.sendUserInput(trimmed);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage(`IPC Error: ${errorMessage}`, false);
    }
  };

  const handleUserInputResponse = async (requestId: string, action: UserInputAction) => {
    try {
      await agentRunClient.sendUserInputResponse(
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
      const res = await agentRunClient.submitApiKey(apiKeyInput.trim());
      if (res.success) {
        setShowApiKeyPrompt(false);
        const initRes = await agentRunClient.initSession();
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
      const res = await agentRunClient.selectSession(sessionId);
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
        setUsage(state.usage);
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
    agentRunClient.onAgentEvent((event: AgentEvent) => {
      if (event.type === AgentEventType.UPDATE_TOOL_EXECUTION_POLICY) {
        agentRunClient.getSessions().then((sessionRes) => {
          if (sessionRes.success && sessionRes.sessions) {
            setSessions(sessionRes.sessions);
          }
        });
      }

      const newState = processEvent(chatStateRef.current, event);

      setMessages(newState.messages);
      setIsLoading(newState.isLoading);
      setIsThinking(newState.isThinking);
      setUsage(newState.usage);
      activeStreamMessageIdRef.current = newState.activeStreamMessageId || null;
    });

    agentRunClient.onSessionMetadataChange((metadata: SessionMetadata) => {
      setSessions((prevSessions) =>
        prevSessions.map((s) => (s.id === metadata.id ? metadata : s)),
      );
    });

    agentRunClient.initSession().then((res) => {
      if (res && !res.success && res.needApiKey) {
        setShowApiKeyPrompt(true);
      } else if (res && res.success && res.sessionId) {
        handleSelectSession(res.sessionId);
        agentRunClient.getSessions().then((sessionRes) => {
          if (sessionRes.success && sessionRes.sessions) {
            setSessions(sessionRes.sessions);
          }
        });
      }
    });
  }, []);

  const handleDeleteSession = (sessionId: string) => {
    dialogService.open(ConfirmationDialog, {
      title: 'Delete Session',
      confirmLabel: 'Delete',
      message: 'Are you sure you want to delete this session? This action cannot be undone.',
      onConfirm: async () => {
        await handleConfirmDelete(sessionId);
      },
    });
  };

  const handleConfirmDelete = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const res = await agentRunClient.deleteSession(sessionId);
      if (res.success) {
        const sessionRes = await agentRunClient.getSessions();
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
    setUsage(undefined);
    try {
      const res = await agentRunClient.startNewSession();
      if (res.success) {
        const currentRes = await agentRunClient.getCurrentSession();
        if (currentRes.success && currentRes.session) {
          handleSelectSession(currentRes.session.id);
        }
        const sessionRes = await agentRunClient.getSessions();
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

  const handleAbort = async () => {
    try {
      await agentRunClient.abortExecution();
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
          <ChatHeader
            session={activeSession}
            toolPolicy={toolPolicy}
            onToolPolicyChange={handleToolPolicyChange}
            usage={usage}
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
            isLoading={isLoading}
            onAbort={handleAbort}
          />
        </main>
      </div>
    </>
  );
}
