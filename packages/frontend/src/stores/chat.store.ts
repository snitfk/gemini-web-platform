import { create } from 'zustand';
import type { ChatSession, Message } from '@/services/chat.service';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  chatPanelWidth: number;
  chatPanelCollapsed: boolean;

  // Session operations
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;

  // Message operations
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Streaming operations
  setStreaming: (isStreaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  clearStreamContent: () => void;

  // Panel operations
  setChatPanelWidth: (width: number) => void;
  toggleChatPanel: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  chatPanelWidth: 400,
  chatPanelCollapsed: false,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    })),

  removeSession: (sessionId) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      let activeSessionId = state.activeSessionId;

      if (activeSessionId === sessionId) {
        activeSessionId = sessions.length > 0 ? sessions[0].id : null;
      }

      return { sessions, activeSessionId };
    }),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setStreaming: (isStreaming) => {
    console.log('[ChatStore] setStreaming', { isStreaming });
    set({ isStreaming });
  },

  appendStreamContent: (content) => {
    console.log('[ChatStore] appendStreamContent', { content });
    set((state) => {
      const newContent = state.streamingContent + content;
      console.log('[ChatStore] New streaming content', { newContent, length: newContent.length });
      return { streamingContent: newContent };
    });
  },

  clearStreamContent: () => {
    console.log('[ChatStore] clearStreamContent');
    set({ streamingContent: '' });
  },

  setChatPanelWidth: (width) => set({ chatPanelWidth: width }),

  toggleChatPanel: () =>
    set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed })),
}));
