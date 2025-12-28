import { io, Socket } from 'socket.io-client';
import { getEnv } from '@/lib/env';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface WebSocketEvents {
  // Connection events
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;

  // User events
  'user:joined': (data: { userId: string; email: string; timestamp: string }) => void;
  'user:left': (data: { userId: string; email: string; timestamp: string }) => void;

  // Workspace events
  'workspace:status': (data: WorkspaceStatusEvent) => void;

  // Container events
  'container:stats': (data: ContainerStatsEvent) => void;

  // File events
  'file:changed': (data: FileChangeEvent) => void;

  // Health check
  'pong': (data: { timestamp: string }) => void;
}

export interface ContainerStatsEvent {
  workspaceId: string;
  containerId: string;
  stats: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
    timestamp: string;
  };
}

export interface FileChangeEvent {
  workspaceId: string;
  action: 'created' | 'updated' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    lastModified?: string;
  };
  timestamp: string;
}

export interface WorkspaceStatusEvent {
  workspaceId: string;
  status: 'active' | 'stopped' | 'error';
  message?: string;
  timestamp: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.setStatus('connecting');

    const wsUrl = getEnv('VITE_WS_URL') || getEnv('VITE_API_URL') || '';

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.setStatus('disconnected');
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setStatus('error');
      }
      this.emit('connect_error', error);
    });

    // Forward all events to listeners
    this.socket.onAny((event: string, ...args: unknown[]) => {
      this.emit(event, ...args);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('disconnected');
    }
  }

  /**
   * Join a workspace room
   */
  joinWorkspace(workspaceId: string): void {
    this.socket?.emit('workspace:join', workspaceId);
  }

  /**
   * Leave a workspace room
   */
  leaveWorkspace(workspaceId: string): void {
    this.socket?.emit('workspace:leave', workspaceId);
  }

  /**
   * Subscribe to container stats
   */
  subscribeToContainer(workspaceId: string): void {
    this.socket?.emit('container:subscribe', workspaceId);
  }

  /**
   * Unsubscribe from container stats
   */
  unsubscribeFromContainer(workspaceId: string): void {
    this.socket?.emit('container:unsubscribe', workspaceId);
  }

  /**
   * Watch file changes in workspace
   */
  watchFiles(workspaceId: string): void {
    this.socket?.emit('file:watch', workspaceId);
  }

  /**
   * Stop watching file changes
   */
  unwatchFiles(workspaceId: string): void {
    this.socket?.emit('file:unwatch', workspaceId);
  }

  /**
   * Send ping for health check
   */
  ping(): void {
    this.socket?.emit('ping');
  }

  /**
   * Add event listener
   */
  on<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ): void {
    this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in WebSocket event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
