export interface ChatMessage {
  id: string;
  content: string;
  thought?: string;
  isUser: boolean;
  type?:
    | 'default'
    | 'compaction'
    | 'tool_call'
    | 'tool_response'
    | 'error'
    | 'user_input_request';
}
