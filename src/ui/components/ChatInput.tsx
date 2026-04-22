interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSend: (text: string) => void;
  showApiKeyPrompt: boolean;
  apiKeyInput: string;
  setApiKeyInput: (val: string) => void;
  handleSubmitApiKey: () => void;
}

export function ChatInput({
  inputValue,
  setInputValue,
  handleSend,
  showApiKeyPrompt,
  apiKeyInput,
  setApiKeyInput,
  handleSubmitApiKey,
}: ChatInputProps) {
  return (
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
  );
}
