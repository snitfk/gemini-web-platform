import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWebSocketStore } from '@/stores/websocket.store';
import {
  wsClient,
  type ConnectionStatus,
  type WebSocketEvents,
  type ContainerStatsEvent,
  type FileChangeEvent,
  type WorkspaceStatusEvent,
} from '@/lib/websocket/client';

/**
 * Main WebSocket hook - manages connection lifecycle
 */
export function useWebSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { status, setStatus, setConnected } = useWebSocketStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      wsClient.disconnect();
      return;
    }

    // Connect to WebSocket
    wsClient.connect(accessToken);

    // Subscribe to status changes
    const unsubscribe = wsClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setConnected(newStatus === 'connected');
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [isAuthenticated, accessToken, setStatus, setConnected]);

  const connect = useCallback(() => {
    if (accessToken) {
      wsClient.connect(accessToken);
    }
  }, [accessToken]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };
}

/**
 * Hook to subscribe to specific WebSocket events
 */
export function useWebSocketEvent<K extends keyof WebSocketEvents>(
  event: K,
  callback: WebSocketEvents[K]
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = ((...args: unknown[]) => {
      (callbackRef.current as (...args: unknown[]) => void)(...args);
    }) as WebSocketEvents[K];

    const unsubscribe = wsClient.on(event, handler);
    return unsubscribe;
  }, [event]);
}

/**
 * Hook for workspace room management
 */
export function useWorkspaceRoom(workspaceId: string | undefined) {
  const { isConnected } = useWebSocketStore();

  useEffect(() => {
    if (!workspaceId || !isConnected) return;

    wsClient.joinWorkspace(workspaceId);

    return () => {
      wsClient.leaveWorkspace(workspaceId);
    };
  }, [workspaceId, isConnected]);
}

/**
 * Hook for container stats subscription
 */
export function useContainerStats(
  workspaceId: string | undefined,
  onStats?: (stats: ContainerStatsEvent) => void
) {
  const { isConnected } = useWebSocketStore();

  useEffect(() => {
    if (!workspaceId || !isConnected) return;

    wsClient.subscribeToContainer(workspaceId);

    return () => {
      wsClient.unsubscribeFromContainer(workspaceId);
    };
  }, [workspaceId, isConnected]);

  useWebSocketEvent('container:stats', (data) => {
    if (data.workspaceId === workspaceId) {
      onStats?.(data);
    }
  });
}

/**
 * Hook for file change watching
 */
export function useFileChanges(
  workspaceId: string | undefined,
  onFileChange?: (change: FileChangeEvent) => void
) {
  const { isConnected } = useWebSocketStore();

  useEffect(() => {
    if (!workspaceId || !isConnected) return;

    wsClient.watchFiles(workspaceId);

    return () => {
      wsClient.unwatchFiles(workspaceId);
    };
  }, [workspaceId, isConnected]);

  useWebSocketEvent('file:changed', (data) => {
    if (data.workspaceId === workspaceId) {
      onFileChange?.(data);
    }
  });
}

/**
 * Hook for workspace status changes
 */
export function useWorkspaceStatus(
  workspaceId: string | undefined,
  onStatusChange?: (status: WorkspaceStatusEvent) => void
) {
  useWebSocketEvent('workspace:status', (data) => {
    if (data.workspaceId === workspaceId) {
      onStatusChange?.(data);
    }
  });
}

// Re-export types
export type { ConnectionStatus, ContainerStatsEvent, FileChangeEvent, WorkspaceStatusEvent };
