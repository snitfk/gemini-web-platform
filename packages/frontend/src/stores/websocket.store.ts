import { create } from 'zustand';
import type { ConnectionStatus, ContainerStatsEvent } from '@/lib/websocket/client';

interface WebSocketState {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;

  // Container stats (cached per workspace)
  containerStats: Map<string, ContainerStatsEvent>;

  // Online users per workspace
  onlineUsers: Map<string, Set<string>>;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setConnected: (connected: boolean) => void;
  updateContainerStats: (workspaceId: string, stats: ContainerStatsEvent) => void;
  clearContainerStats: (workspaceId: string) => void;
  addOnlineUser: (workspaceId: string, userId: string) => void;
  removeOnlineUser: (workspaceId: string, userId: string) => void;
  clearOnlineUsers: (workspaceId: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  isConnected: false,
  containerStats: new Map<string, ContainerStatsEvent>(),
  onlineUsers: new Map<string, Set<string>>(),
};

export const useWebSocketStore = create<WebSocketState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setConnected: (connected) => set({ isConnected: connected }),

  updateContainerStats: (workspaceId, stats) =>
    set((state) => {
      const newStats = new Map(state.containerStats);
      newStats.set(workspaceId, stats);
      return { containerStats: newStats };
    }),

  clearContainerStats: (workspaceId) =>
    set((state) => {
      const newStats = new Map(state.containerStats);
      newStats.delete(workspaceId);
      return { containerStats: newStats };
    }),

  addOnlineUser: (workspaceId, userId) =>
    set((state) => {
      const newUsers = new Map(state.onlineUsers);
      if (!newUsers.has(workspaceId)) {
        newUsers.set(workspaceId, new Set());
      }
      newUsers.get(workspaceId)!.add(userId);
      return { onlineUsers: newUsers };
    }),

  removeOnlineUser: (workspaceId, userId) =>
    set((state) => {
      const newUsers = new Map(state.onlineUsers);
      newUsers.get(workspaceId)?.delete(userId);
      return { onlineUsers: newUsers };
    }),

  clearOnlineUsers: (workspaceId) =>
    set((state) => {
      const newUsers = new Map(state.onlineUsers);
      newUsers.delete(workspaceId);
      return { onlineUsers: newUsers };
    }),

  reset: () => set(initialState),
}));
