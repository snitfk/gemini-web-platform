import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

// Socket data attached to each connection
interface SocketData {
  user: {
    id: string;
    email: string;
  };
}

// Event types
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

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private static instance: WebSocketService | null = null;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin.split(','),
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e8, // 100 MB
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupErrorHandlers();

    WebSocketService.instance = this;
    logger.info('WebSocket service initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketService | null {
    return WebSocketService.instance;
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload: JwtPayload = verifyToken(token);

        if (payload.type !== 'access') {
          return next(new Error('Invalid token type'));
        }

        // Attach user data to socket
        (socket.data as SocketData).user = {
          id: payload.userId,
          email: payload.email,
        };

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userData = (socket.data as SocketData).user;
      const userId = userData.id;

      logger.info(`WebSocket connected: ${socket.id} (user: ${userId})`);

      // Track connected users
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Auto-join user's personal room
      socket.join(`user:${userId}`);

      // Handle workspace room join
      socket.on('workspace:join', (workspaceId: string) => {
        socket.join(`workspace:${workspaceId}`);
        logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}`);

        // Notify others in workspace
        socket.to(`workspace:${workspaceId}`).emit('user:joined', {
          userId,
          email: userData.email,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle workspace room leave
      socket.on('workspace:leave', (workspaceId: string) => {
        socket.leave(`workspace:${workspaceId}`);
        logger.debug(`Socket ${socket.id} left workspace:${workspaceId}`);

        // Notify others in workspace
        socket.to(`workspace:${workspaceId}`).emit('user:left', {
          userId,
          email: userData.email,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle container stats subscription
      socket.on('container:subscribe', (workspaceId: string) => {
        socket.join(`container:${workspaceId}`);
        logger.debug(`Socket ${socket.id} subscribed to container:${workspaceId}`);
      });

      socket.on('container:unsubscribe', (workspaceId: string) => {
        socket.leave(`container:${workspaceId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from container:${workspaceId}`);
      });

      // Handle file watch subscription
      socket.on('file:watch', (workspaceId: string) => {
        socket.join(`files:${workspaceId}`);
        logger.debug(`Socket ${socket.id} watching files:${workspaceId}`);
      });

      socket.on('file:unwatch', (workspaceId: string) => {
        socket.leave(`files:${workspaceId}`);
        logger.debug(`Socket ${socket.id} unwatched files:${workspaceId}`);
      });

      // Handle ping for connection health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`WebSocket disconnected: ${socket.id} (reason: ${reason})`);

        // Remove from tracked users
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }
      });
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers() {
    this.io.engine.on('connection_error', (err) => {
      logger.error('WebSocket connection error:', err);
    });
  }

  /**
   * Send event to a specific user (all their connections)
   */
  sendToUser(userId: string, event: string, data: unknown) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send event to all users in a workspace
   */
  sendToWorkspace(workspaceId: string, event: string, data: unknown) {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  /**
   * Send container stats to subscribers
   */
  sendContainerStats(workspaceId: string, stats: ContainerStatsEvent) {
    this.io.to(`container:${workspaceId}`).emit('container:stats', stats);
  }

  /**
   * Send file change notification
   */
  sendFileChange(workspaceId: string, change: FileChangeEvent) {
    this.io.to(`files:${workspaceId}`).emit('file:changed', change);
  }

  /**
   * Send workspace status update
   */
  sendWorkspaceStatus(workspaceId: string, status: WorkspaceStatusEvent) {
    this.io.to(`workspace:${workspaceId}`).emit('workspace:status', status);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: unknown) {
    this.io.emit(event, data);
  }

  /**
   * Get count of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId: string): string[] {
    return Array.from(this.connectedUsers.get(userId) || []);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get server instance for advanced operations
   */
  getServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

// Export singleton getter
export function getWebSocketService(): WebSocketService | null {
  return WebSocketService.getInstance();
}
