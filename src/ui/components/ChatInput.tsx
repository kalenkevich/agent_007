import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSend: (text: string) => void;
  showApiKeyPrompt: boolean;
  apiKeyInput: string;
  setApiKeyInput: (val: string) => void;
  handleSubmitApiKey: () => void;
  isLoading: boolean;
  onAbort: () => void;
}

export function ChatInput({
  inputValue,
  setInputValue,
  handleSend,
  showApiKeyPrompt,
  apiKeyInput,
  setApiKeyInput,
  handleSubmitApiKey,
  isLoading,
  onAbort,
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
        <PromptInput className="input-wrapper">
          <PromptInputTextarea
            id="user-input"
            placeholder="Type your command..."
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(inputValue);
              }
            }}
          />
          <div style={{display: 'flex', gap: '0.5rem', alignSelf: 'flex-end'}}>
            {isLoading && (
              <PromptInputSubmit
                id="btn-abort"
                status="streaming"
                onClick={onAbort}
              />
            )}
            <PromptInputSubmit
              id="btn-send"
              onClick={() => handleSend(inputValue)}
            />
          </div>
        </PromptInput>
      )}
    </footer>
  );
}
