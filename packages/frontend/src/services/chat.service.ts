import { apiRequest } from '@/lib/api-client';

export interface ChatSession {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  summary: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatSessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata: Record<string, unknown>;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

export interface SendMessageRequest {
  message: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export interface SendMessageResponse {
  message: Message;
  response: Message;
  toolExecutions?: Array<{
    id: string;
    toolName: string;
    status: string;
    output?: unknown;
    error?: string;
  }>;
}

export interface CreateSessionRequest {
  workspaceId: string;
  title?: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

export const chatService = {
  async listSessions(workspaceId: string): Promise<{ sessions: ChatSession[] }> {
    return apiRequest<{ sessions: ChatSession[] }>({
      method: 'GET',
      url: '/chat/sessions',
      params: { workspaceId },
    });
  },

  async getSession(sessionId: string): Promise<{ session: ChatSession; messages: Message[] }> {
    return apiRequest<{ session: ChatSession; messages: Message[] }>({
      method: 'GET',
      url: `/chat/sessions/${sessionId}`,
    });
  },

  async createSession(data: CreateSessionRequest): Promise<ChatSession> {
    return apiRequest<ChatSession>({
      method: 'POST',
      url: '/chat/sessions',
      data,
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    return apiRequest({
      method: 'DELETE',
      url: `/chat/sessions/${sessionId}`,
    });
  },

  async sendMessage(sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
    return apiRequest({
      method: 'POST',
      url: `/chat/sessions/${sessionId}/messages`,
      data,
    });
  },

  async streamMessage(
    sessionId: string,
    data: SendMessageRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: SendMessageResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const { env } = await import('@/lib/env');
    const baseURL = env.VITE_API_BASE_URL || '/api';

    const response = await fetch(`${baseURL}/chat/sessions/${sessionId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      onError(new Error(`HTTP error! status: ${response.status}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              // 匹配后端的事件类型
              if (parsed.type === 'content') {
                onChunk(parsed.content);
              } else if (parsed.type === 'done') {
                // done 事件表示流式传输完成,但没有完整响应数据
                // 前端需要自己构造响应对象
                onComplete(parsed.data || {});
              } else if (parsed.type === 'error') {
                onError(new Error(parsed.error || 'Unknown error'));
              } else if (parsed.type === 'connected') {
                // 忽略连接消息
                console.log('SSE connected');
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, data);
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Stream error'));
    }
  },
};
