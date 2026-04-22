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

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingUserInput, setPendingUserInput] = useState<AgentEvent | null>(
    null,
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
        {/* Sidebar / Profile Panel */}
        <aside className="sidebar glass-panel">
          <div className="brand">
            <div className="logo-icon">🤖</div>
            <h1>
              Agent<span className="gradient-text">007</span>
            </h1>
          </div>

          <div className="status-card">
            <div className="status-indicator">
              <span
                className="pulse-dot"
                style={{
                  background: isLoading || isThinking ? '#ffbc00' : '#00ff88',
                  boxShadow:
                    isLoading || isThinking
                      ? '0 0 12px #ffbc00'
                      : '0 0 12px #00ff88',
                }}></span>
              <span className="status-text">
                {isLoading
                  ? 'Loading...'
                  : isThinking
                    ? 'Thinking...'
                    : 'Secure & Active'}
              </span>
            </div>
            <p className="status-detail">Connecting via Local Neural Engine</p>
          </div>

          <div className="quick-actions">
            <h3>Quick Commands</h3>
            <button
              className="btn btn-action"
              onClick={() => handleQuickAction('Who are you?')}>
              Identity Check
            </button>
            <button
              className="btn btn-action"
              onClick={() => handleQuickAction('Analyze current workspace')}>
              Scan Workspace
            </button>
            <button
              className="btn btn-action"
              onClick={() => handleQuickAction('/init')}>
              Initialize Project
            </button>
            <button
              className="btn btn-action"
              onClick={() =>
                handleQuickAction('/plan refactor authentication module')
              }>
              Plan Refactor
            </button>
          </div>

          <div className="system-info">
            <p>System Architecture: Node.js/ES2022</p>
            <p>Interface: React & Electron</p>
          </div>
        </aside>

        {/* Main Chat Panel */}
        <main className="chat-area">
          <header className="chat-header glass-panel">
            <div className="header-info">
              <h2>Agent Console</h2>
              <p>Model: Default Gemini Llm</p>
            </div>
          </header>

          {/* Message Stream */}
          <div
            className="message-stream"
            id="message-stream"
            ref={messageStreamRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.author === ContentRole.USER ? 'user-msg' : 'system-msg'}`}>
                <div className="avatar">
                  {msg.author === ContentRole.USER ? '👤' : '🤖'}
                </div>
                <div className="msg-content">
                  {msg.thinkingText && msg.thinkingText.length > 0 && (
                    <div
                      style={{
                        fontStyle: 'italic',
                        opacity: 0.7,
                        marginBottom: '8px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                      }}>
                      💭 {msg.thinkingText.join('\n')}
                    </div>
                  )}
                  {msg.content && (
                    <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Input Area */}
          <footer className="chat-footer glass-panel">
            {showApiKeyPrompt ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '1rem',
                  borderRadius: '16px',
                }}>
                <p style={{fontWeight: 600, color: '#00f2fe'}}>
                  🔑 Please enter your Gemini API Key:
                </p>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                  <button
                    className="btn btn-action"
                    style={{background: '#00ff88', color: '#000'}}
                    onClick={handleSubmitApiKey}>
                    Submit
                  </button>
                </div>
              </div>
            ) : pendingUserInput ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '1rem',
                  borderRadius: '16px',
                }}>
                <p style={{fontWeight: 600, color: '#00f2fe'}}>
                  ❓ {pendingUserInput.message}
                </p>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button
                    className="btn btn-action"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#00ff88',
                      color: '#000',
                    }}
                    onClick={() => handleUserInputResponse('accept')}>
                    Yes
                  </button>
                  <button
                    className="btn btn-action"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#ff4444',
                      color: '#fff',
                    }}
                    onClick={() => handleUserInputResponse('decline')}>
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className="input-wrapper">
                <input
                  type="text"
                  id="user-input"
                  placeholder="Type your command..."
                  autoComplete="off"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSend(inputValue);
                    }
                  }}
                />
                <button
                  className="btn-send"
                  id="btn-send"
                  onClick={() => handleSend(inputValue)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M2 12L22 2M2 12l10 4M2 12l7-9M22 2L12 22"
                    />
                  </svg>
                </button>
              </div>
            )}
          </footer>
        </main>
      </div>
    </>
  );
}
