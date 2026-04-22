import {
  ContentRole,
  isUserInputRequestEvent,
  type AgentEvent,
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

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const handleQuickAction = (cmd: string) => {
    handleSend(cmd);
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const res = await agentClient.getSession(sessionId);
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
          isLoading={isLoading}
          isThinking={isThinking}
          onQuickAction={handleQuickAction}
          onSelectSession={handleSelectSession}
          activeSessionId={activeSessionId}
        />

        <main className="chat-area">
          <ChatHeader />

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
    </>
  );
}
