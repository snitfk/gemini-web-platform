# Phase 5 详细计划: WebSocket 和实时功能

## 📋 概览

**阶段目标**: 实现 WebSocket 双向通信，支持实时协作、状态监控和文件同步
**持续时间**: 10 天
**关键产出**: WebSocket 服务器 + 实时通信系统 + 容器监控 + 文件同步

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 5.1 WebSocket 服务器设置 | 2 天 | 后端 #1 | 阶段 4 完成 |
| 5.2 前端 WebSocket 客户端 | 2 天 | 前端 #1 | 5.1 完成 |
| 5.3 实时容器状态监控 | 3 天 | 后端 #1 + 前端 #1 | 5.2 完成 |
| 5.4 文件同步通知系统 | 3 天 | 后端 #1 + 前端 #1 | 5.2 完成 |

**注意**: 5.3 和 5.4 可以并行进行

---

## 概览

Phase 5 实现基于 WebSocket 的实时通信系统，为应用提供以下能力：

### 核心功能
- ✅ WebSocket 服务器设置和认证
- ✅ 前端 WebSocket 客户端管理
- ✅ 实时容器状态监控
- ✅ 文件变更实时同步通知
- ✅ 用户在线状态管理
- ✅ 房间（Room）管理和广播

### 技术栈
- **后端**: Socket.IO 4.6+
- **前端**: Socket.IO Client 4.6+
- **认证**: JWT Token
- **消息格式**: JSON
- **传输协议**: WebSocket (fallback to polling)

---

## 阶段架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ WebSocket Hook │  │ WebSocket Store │  │ Event System │ │
│  └────────┬───────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                   │                   │          │
│           └───────────────────┴───────────────────┘          │
│                              │                               │
│                    Socket.IO Client                          │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               │ WebSocket Connection
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                              │                               │
│                       Socket.IO Server                       │
│           ┌──────────────────┴────────────────┐             │
│           │                                    │             │
│  ┌────────▼─────────┐              ┌─────────▼──────────┐  │
│  │ Authentication   │              │   Event Handlers   │  │
│  │   Middleware     │              │  - join:workspace  │  │
│  └──────────────────┘              │  - terminal:input  │  │
│                                     │  - file:watch      │  │
│  ┌──────────────────┐              └────────────────────┘  │
│  │  Room Manager    │                                       │
│  │ - user:${id}     │              ┌────────────────────┐  │
│  │ - workspace:${id}│              │  Broadcast Service │  │
│  └──────────────────┘              └────────────────────┘  │
│                                                              │
│                         Backend Services                     │
└──────────────────────────────────────────────────────────────┘
```

---

# Day 1-2: WebSocket 服务器基础设置

## 目标
- 安装和配置 Socket.IO 服务器
- 实现 JWT 认证中间件
- 建立基础事件处理系统
- 实现房间管理机制

---

## 步骤 1.1: 安装依赖

```bash
cd packages/backend
pnpm add socket.io@^4.6.0
pnpm add -D @types/socket.io@^3.0.0
```

---

## 步骤 1.2: 创建 WebSocket 服务

创建 `packages/backend/src/services/websocket.service.ts`:

```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface SocketData {
  user: {
    id: string;
    email: string;
  };
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      // 性能优化配置
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e8, // 100 MB
      // 传输方式配置
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupErrorHandlers();
  }

  /**
   * 设置认证中间件
   */
  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          throw new AppError('No token provided', 401);
        }

        // 验证 JWT Token
        const user = await verifyToken(token);

        // 将用户信息附加到 socket
        socket.data = { user } as SocketData;

        logger.info(`WebSocket authentication successful for user: ${user.id}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * 设置核心事件处理器
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user?.id;

      if (!userId) {
        socket.disconnect();
        return;
      }

      logger.info(`User connected: ${userId} (socket: ${socket.id})`);

      // 记录用户连接
      this.trackUserConnection(userId, socket.id);

      // 加入用户专属房间
      socket.join(`user:${userId}`);

      // 发送连接成功消息
      socket.emit('connected', {
        socketId: socket.id,
        userId,
        timestamp: new Date().toISOString(),
      });

      // 广播用户在线状态
      this.broadcastUserStatus(userId, 'online');

      // ========== 工作区相关事件 ==========
      socket.on('join:workspace', (workspaceId: string) => {
        this.handleJoinWorkspace(socket, workspaceId);
      });

      socket.on('leave:workspace', (workspaceId: string) => {
        this.handleLeaveWorkspace(socket, workspaceId);
      });

      // ========== 心跳事件 ==========
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // ========== 断开连接 ==========
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, userId, reason);
      });

      // ========== 错误处理 ==========
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers() {
    this.io.engine.on('connection_error', (err) => {
      logger.error('WebSocket connection error:', {
        code: err.code,
        message: err.message,
        context: err.context,
      });
    });
  }

  /**
   * 处理加入工作区事件
   */
  private handleJoinWorkspace(socket: Socket, workspaceId: string) {
    const userId = socket.data.user?.id;

    if (!workspaceId || typeof workspaceId !== 'string') {
      socket.emit('error', { message: 'Invalid workspace ID' });
      return;
    }

    socket.join(`workspace:${workspaceId}`);

    logger.info(`User ${userId} joined workspace ${workspaceId}`);

    // 通知工作区内其他用户
    socket.to(`workspace:${workspaceId}`).emit('workspace:user_joined', {
      userId,
      workspaceId,
      timestamp: new Date().toISOString(),
    });

    // 确认加入成功
    socket.emit('workspace:joined', {
      workspaceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理离开工作区事件
   */
  private handleLeaveWorkspace(socket: Socket, workspaceId: string) {
    const userId = socket.data.user?.id;

    socket.leave(`workspace:${workspaceId}`);

    logger.info(`User ${userId} left workspace ${workspaceId}`);

    // 通知工作区内其他用户
    socket.to(`workspace:${workspaceId}`).emit('workspace:user_left', {
      userId,
      workspaceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理用户断开连接
   */
  private handleDisconnect(socket: Socket, userId: string, reason: string) {
    logger.info(`User disconnected: ${userId} (reason: ${reason})`);

    // 移除用户连接记录
    this.removeUserConnection(userId, socket.id);

    // 如果用户没有其他连接，广播离线状态
    if (!this.isUserConnected(userId)) {
      this.broadcastUserStatus(userId, 'offline');
    }
  }

  /**
   * 记录用户连接
   */
  private trackUserConnection(userId: string, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  /**
   * 移除用户连接记录
   */
  private removeUserConnection(userId: string, socketId: string) {
    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  /**
   * 检查用户是否在线
   */
  private isUserConnected(userId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * 广播用户在线状态
   */
  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    this.io.emit('user:status', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== 公共 API ==========

  /**
   * 发送消息到特定工作区
   */
  sendToWorkspace(workspaceId: string, event: string, data: any) {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
    logger.debug(`Sent ${event} to workspace ${workspaceId}`);
  }

  /**
   * 发送消息到特定用户（所有连接）
   */
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Sent ${event} to user ${userId}`);
  }

  /**
   * 广播消息到所有连接的客户端
   */
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
    logger.debug(`Broadcast ${event} to all clients`);
  }

  /**
   * 获取 Socket.IO 实例
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * 获取特定工作区的连接数
   */
  async getWorkspaceConnectionCount(workspaceId: string): Promise<number> {
    const sockets = await this.io.in(`workspace:${workspaceId}`).fetchSockets();
    return sockets.length;
  }

  /**
   * 关闭 WebSocket 服务
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
```

---

## 步骤 1.3: 集成到主应用

更新 `packages/backend/src/index.ts`:

```typescript
import { createServer } from 'http';
import { app } from './app';
import { WebSocketService } from './services/websocket.service';
import { logger } from './utils/logger';
import { config } from './config';

const PORT = config.port || 8000;

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 初始化 WebSocket 服务
const wsService = new WebSocketService(httpServer);

// 将 WebSocket 服务挂载到 Express app
app.set('wsService', wsService);

// 启动服务器
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`🌍 Environment: ${config.env}`);
});

// 优雅关闭
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  await wsService.close();

  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // 如果 10 秒后还未关闭，强制退出
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

---

## 步骤 1.4: 添加 WebSocket 工具类型

创建 `packages/backend/src/types/websocket.types.ts`:

```typescript
export interface WebSocketUser {
  id: string;
  email: string;
}

export interface WebSocketEventData {
  timestamp: string;
  [key: string]: any;
}

export interface WorkspaceEventData extends WebSocketEventData {
  workspaceId: string;
  userId?: string;
}

export interface FileChangeEventData extends WorkspaceEventData {
  action: 'created' | 'updated' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  metadata?: any;
}

export interface ContainerStatsEventData extends WorkspaceEventData {
  containerId: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  status: string;
}

export interface TerminalEventData extends WorkspaceEventData {
  terminalId: string;
  data: string;
}

export interface UserStatusEventData extends WebSocketEventData {
  userId: string;
  status: 'online' | 'offline';
}
```

---

## Day 1-2 验证检查

运行以下命令验证 WebSocket 服务器设置:

```bash
# 1. 启动后端服务
cd packages/backend
pnpm dev

# 2. 检查日志输出
# 应该看到: "WebSocket server ready"

# 3. 使用 wscat 测试连接（需要安装 wscat）
npm install -g wscat
wscat -c "ws://localhost:8000" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. 检查 Socket.IO 端点
curl http://localhost:8000/socket.io/\?EIO\=4\&transport\=polling
```

### 预期结果
- ✅ 服务器启动无错误
- ✅ WebSocket 端点可访问
- ✅ 认证中间件正常工作
- ✅ 日志正确记录连接/断开事件

---

# Day 3-4: 前端 WebSocket 集成

## 目标
- 实现前端 WebSocket 客户端管理器
- 创建 React Hooks 用于 WebSocket 通信
- 实现自动重连和错误处理
- 集成到 Zustand store

---

## 步骤 3.1: 安装前端依赖

```bash
cd packages/frontend
pnpm add socket.io-client@^4.6.0
```

---

## 步骤 3.2: 创建 WebSocket 客户端管理器

创建 `packages/frontend/src/lib/websocket.ts`:

```typescript
import { io, Socket } from 'socket.io-client';
import { env } from './env';

type EventCallback = (data: any) => void;

interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private isConnecting = false;
  private connectionPromise: Promise<Socket> | null = null;

  /**
   * 连接到 WebSocket 服务器
   */
  connect(token: string, config?: Partial<WebSocketConfig>): Promise<Socket> {
    // 如果已经在连接中，返回现有的 Promise
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // 如果已经连接，直接返回
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      const wsUrl = config?.url || env.VITE_WS_BASE_URL || 'http://localhost:8000';

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: config?.reconnectionDelay || 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: config?.reconnectionAttempts || this.maxReconnectAttempts,
        timeout: 20000,
        autoConnect: config?.autoConnect ?? true,
      });

      // 连接成功
      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected:', this.socket?.id);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        resolve(this.socket!);
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error.message);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.isConnecting = false;
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
        }
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        this.isConnecting = false;

        // 如果是服务器主动断开，尝试重连
        if (reason === 'io server disconnect') {
          this.socket?.connect();
        }
      });

      // 重连尝试
      this.socket.on('reconnect_attempt', (attempt) => {
        console.log(`[WebSocket] Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
      });

      // 重连成功
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
      });

      // 重连失败
      this.socket.on('reconnect_failed', () => {
        console.error('[WebSocket] Reconnection failed');
        this.isConnecting = false;
      });

      // 通用错误处理
      this.socket.on('error', (error) => {
        console.error('[WebSocket] Socket error:', error);
      });

      // 恢复之前注册的事件监听器
      this.restoreEventListeners();
    });

    return this.connectionPromise;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * 发送事件
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn(`[WebSocket] Cannot emit ${event}: not connected`);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * 发送事件并等待响应
   */
  emitWithAck<T = any>(event: string, data?: any, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${event} acknowledgment`));
      }, timeout);

      this.socket.emit(event, data, (response: T) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  /**
   * 监听事件
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.eventCallbacks.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventCallbacks.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * 一次性事件监听
   */
  once(event: string, callback: EventCallback): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }

  /**
   * 恢复事件监听器（重连后使用）
   */
  private restoreEventListeners(): void {
    if (!this.socket) return;

    this.eventCallbacks.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket!.on(event, callback);
      });
    });
  }

  /**
   * 加入工作区
   */
  joinWorkspace(workspaceId: string): void {
    this.emit('join:workspace', workspaceId);
  }

  /**
   * 离开工作区
   */
  leaveWorkspace(workspaceId: string): void {
    this.emit('leave:workspace', workspaceId);
  }

  /**
   * 发送心跳
   */
  ping(): Promise<number> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      this.once('pong', () => {
        resolve(Date.now() - startTime);
      });
      this.emit('ping');
    });
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 获取 Socket 实例
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 获取连接 ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// 导出单例
export const wsManager = new WebSocketManager();
```

---

## 步骤 3.3: 创建 WebSocket Hooks

创建 `packages/frontend/src/hooks/useWebSocket.ts`:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager } from '@/lib/websocket';
import { useAuthStore } from '@/stores/auth.store';

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  latency: number | null;
  reconnect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * WebSocket 连接管理 Hook
 */
export function useWebSocket(): UseWebSocketReturn {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const connectionAttempted = useRef(false);

  const connect = useCallback(async () => {
    if (!accessToken) {
      setError(new Error('No access token available'));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await wsManager.connect(accessToken);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('WebSocket connection failed');
      setError(error);
      setIsConnected(false);
      console.error('[useWebSocket] Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [accessToken]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setIsConnected(false);
  }, []);

  // 自动连接
  useEffect(() => {
    if (!accessToken || connectionAttempted.current) return;

    connectionAttempted.current = true;
    connect();

    return () => {
      disconnect();
      connectionAttempted.current = false;
    };
  }, [accessToken, connect, disconnect]);

  // 监听连接状态变化
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    wsManager.on('connect', handleConnect);
    wsManager.on('disconnect', handleDisconnect);

    return () => {
      wsManager.off('connect', handleConnect);
      wsManager.off('disconnect', handleDisconnect);
    };
  }, []);

  // 定期检测延迟
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(async () => {
      try {
        const ping = await wsManager.ping();
        setLatency(ping);
      } catch (err) {
        console.error('[useWebSocket] Ping failed:', err);
      }
    }, 30000); // 每 30 秒检测一次

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    error,
    latency,
    reconnect: connect,
    disconnect,
  };
}

/**
 * WebSocket 事件监听 Hook
 */
export function useWebSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { isConnected } = useWebSocket();
  const savedCallback = useRef(callback);

  // 保存最新的 callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isConnected) return;

    const handler = (data: T) => {
      savedCallback.current(data);
    };

    wsManager.on(event, handler);

    return () => {
      wsManager.off(event, handler);
    };
  }, [event, isConnected, ...deps]);
}

/**
 * 工作区房间管理 Hook
 */
export function useWorkspaceRoom(workspaceId: string | null) {
  const { isConnected } = useWebSocket();
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!isConnected || !workspaceId) {
      setIsJoined(false);
      return;
    }

    // 加入工作区
    wsManager.joinWorkspace(workspaceId);

    // 监听加入成功事件
    const handleJoined = (data: { workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        setIsJoined(true);
      }
    };

    wsManager.on('workspace:joined', handleJoined);

    return () => {
      // 离开工作区
      wsManager.leaveWorkspace(workspaceId);
      wsManager.off('workspace:joined', handleJoined);
      setIsJoined(false);
    };
  }, [isConnected, workspaceId]);

  return { isJoined };
}
```

---

## 步骤 3.4: 创建 WebSocket Store

创建 `packages/frontend/src/stores/websocket.store.ts`:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  latency: number | null;
  onlineUsers: Set<string>;
  workspaceUsers: Map<string, Set<string>>; // workspaceId -> Set<userId>
}

interface WebSocketActions {
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setLatency: (latency: number | null) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  addWorkspaceUser: (workspaceId: string, userId: string) => void;
  removeWorkspaceUser: (workspaceId: string, userId: string) => void;
  getWorkspaceUsers: (workspaceId: string) => Set<string>;
  reset: () => void;
}

type WebSocketStore = WebSocketState & WebSocketActions;

const initialState: WebSocketState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  latency: null,
  onlineUsers: new Set(),
  workspaceUsers: new Map(),
};

export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setConnected: (connected) => set({ isConnected: connected }),

      setConnecting: (connecting) => set({ isConnecting: connecting }),

      setError: (error) => set({ error }),

      setLatency: (latency) => set({ latency }),

      addOnlineUser: (userId) =>
        set((state) => ({
          onlineUsers: new Set(state.onlineUsers).add(userId),
        })),

      removeOnlineUser: (userId) =>
        set((state) => {
          const newSet = new Set(state.onlineUsers);
          newSet.delete(userId);
          return { onlineUsers: newSet };
        }),

      addWorkspaceUser: (workspaceId, userId) =>
        set((state) => {
          const newMap = new Map(state.workspaceUsers);
          if (!newMap.has(workspaceId)) {
            newMap.set(workspaceId, new Set());
          }
          newMap.get(workspaceId)!.add(userId);
          return { workspaceUsers: newMap };
        }),

      removeWorkspaceUser: (workspaceId, userId) =>
        set((state) => {
          const newMap = new Map(state.workspaceUsers);
          newMap.get(workspaceId)?.delete(userId);
          return { workspaceUsers: newMap };
        }),

      getWorkspaceUsers: (workspaceId) => {
        return get().workspaceUsers.get(workspaceId) || new Set();
      },

      reset: () => set(initialState),
    }),
    { name: 'WebSocket Store' }
  )
);
```

---

## 步骤 3.5: 创建 WebSocket 状态指示器组件

创建 `packages/frontend/src/components/common/WebSocketStatus.tsx`:

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WebSocketStatus() {
  const { isConnected, isConnecting, latency, error, reconnect } = useWebSocket();

  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: RefreshCw,
        text: 'Connecting',
        variant: 'secondary' as const,
        iconClass: 'animate-spin',
      };
    }

    if (isConnected) {
      return {
        icon: Wifi,
        text: latency ? `${latency}ms` : 'Connected',
        variant: 'default' as const,
        iconClass: '',
      };
    }

    return {
      icon: WifiOff,
      text: 'Disconnected',
      variant: 'destructive' as const,
      iconClass: '',
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={status.variant}
          className="cursor-pointer gap-1.5"
          onClick={() => !isConnected && !isConnecting && reconnect()}
        >
          <Icon className={cn('h-3 w-3', status.iconClass)} />
          <span className="text-xs">{status.text}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {error ? (
          <div className="space-y-1">
            <p className="font-medium">Connection Error</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            <p className="text-xs">Click to retry</p>
          </div>
        ) : (
          <p>
            {isConnected
              ? `WebSocket connected${latency ? ` • Latency: ${latency}ms` : ''}`
              : isConnecting
              ? 'Connecting to server...'
              : 'Click to reconnect'}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## Day 3-4 验证检查

```bash
# 1. 启动前端开发服务器
cd packages/frontend
pnpm dev

# 2. 打开浏览器控制台，检查 WebSocket 连接日志
# 应该看到: "[WebSocket] Connected: <socket-id>"

# 3. 检查网络面板中的 WebSocket 连接
# Network -> WS -> 应该看到活跃的 WebSocket 连接

# 4. 测试重连机制
# 停止后端服务，观察前端是否自动重连
```

### 预期结果
- ✅ WebSocket 成功连接
- ✅ 连接状态正确显示
- ✅ 断线后自动重连
- ✅ 延迟检测正常工作

---

# Day 5-7: 实时容器状态监控

## 目标
- 实现后端容器监控服务
- 定时采集容器性能数据
- 通过 WebSocket 实时推送状态
- 前端实时显示容器统计信息

---

## 步骤 5.1: 创建容器监控服务

创建 `packages/backend/src/services/container-monitor.service.ts`:

```typescript
import { WebSocketService } from './websocket.service';
import { ContainerService } from './container.service';
import { logger } from '../utils/logger';
import { ContainerStatsEventData } from '../types/websocket.types';

interface MonitoringConfig {
  interval: number; // 监控间隔（毫秒）
  cpuThreshold: number; // CPU 使用率告警阈值
  memoryThreshold: number; // 内存使用率告警阈值
}

const DEFAULT_CONFIG: MonitoringConfig = {
  interval: 2000, // 2 seconds
  cpuThreshold: 80, // 80%
  memoryThreshold: 90, // 90%
};

export class ContainerMonitorService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private monitoredWorkspaces: Set<string> = new Set();

  constructor(
    private wsService: WebSocketService,
    private containerService: ContainerService,
    private config: MonitoringConfig = DEFAULT_CONFIG
  ) {}

  /**
   * 开始监控工作区的容器
   */
  async startMonitoring(workspaceId: string, containerId: string): Promise<void> {
    if (this.intervals.has(workspaceId)) {
      logger.warn(`Already monitoring workspace: ${workspaceId}`);
      return;
    }

    logger.info(`Starting container monitoring for workspace: ${workspaceId}`);

    try {
      // 首次立即获取状态
      await this.collectAndBroadcastStats(workspaceId, containerId);

      // 设置定时任务
      const interval = setInterval(async () => {
        await this.collectAndBroadcastStats(workspaceId, containerId);
      }, this.config.interval);

      this.intervals.set(workspaceId, interval);
      this.monitoredWorkspaces.add(workspaceId);
    } catch (error) {
      logger.error(`Failed to start monitoring for workspace ${workspaceId}:`, error);
      throw error;
    }
  }

  /**
   * 停止监控工作区的容器
   */
  stopMonitoring(workspaceId: string): void {
    const interval = this.intervals.get(workspaceId);

    if (interval) {
      clearInterval(interval);
      this.intervals.delete(workspaceId);
      this.monitoredWorkspaces.delete(workspaceId);
      logger.info(`Stopped monitoring workspace: ${workspaceId}`);
    }
  }

  /**
   * 停止所有监控
   */
  stopAllMonitoring(): void {
    logger.info('Stopping all container monitoring...');

    this.intervals.forEach((interval, workspaceId) => {
      clearInterval(interval);
      logger.debug(`Stopped monitoring: ${workspaceId}`);
    });

    this.intervals.clear();
    this.monitoredWorkspaces.clear();
  }

  /**
   * 采集并广播容器统计信息
   */
  private async collectAndBroadcastStats(
    workspaceId: string,
    containerId: string
  ): Promise<void> {
    try {
      // 获取容器信息
      const containerInfo = await this.containerService.getContainerInfo(
        containerId,
        workspaceId
      );

      // 获取容器统计数据
      const stats = await this.containerService.getContainerStats(containerId);

      const statsData: ContainerStatsEventData = {
        workspaceId,
        containerId,
        cpuUsage: stats.cpuUsage,
        memoryUsage: stats.memoryUsage,
        memoryLimit: stats.memoryLimit,
        networkRx: stats.networkRx,
        networkTx: stats.networkTx,
        status: containerInfo.status,
        timestamp: new Date().toISOString(),
      };

      // 广播到工作区
      this.wsService.sendToWorkspace(workspaceId, 'container:stats', statsData);

      // 检查是否超过阈值，发送告警
      this.checkThresholds(workspaceId, statsData);
    } catch (error) {
      logger.error(
        `Failed to collect stats for workspace ${workspaceId}, container ${containerId}:`,
        error
      );

      // 广播错误事件
      this.wsService.sendToWorkspace(workspaceId, 'container:error', {
        workspaceId,
        containerId,
        error: 'Failed to collect container statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 检查性能阈值并发送告警
   */
  private checkThresholds(workspaceId: string, stats: ContainerStatsEventData): void {
    const warnings: string[] = [];

    if (stats.cpuUsage > this.config.cpuThreshold) {
      warnings.push(`CPU usage is high: ${stats.cpuUsage.toFixed(1)}%`);
    }

    if (stats.memoryUsage > this.config.memoryThreshold) {
      warnings.push(`Memory usage is high: ${stats.memoryUsage.toFixed(1)}%`);
    }

    if (warnings.length > 0) {
      this.wsService.sendToWorkspace(workspaceId, 'container:warning', {
        workspaceId,
        containerId: stats.containerId,
        warnings,
        stats,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 获取当前监控的工作区列表
   */
  getMonitoredWorkspaces(): string[] {
    return Array.from(this.monitoredWorkspaces);
  }

  /**
   * 检查工作区是否正在被监控
   */
  isMonitoring(workspaceId: string): boolean {
    return this.monitoredWorkspaces.has(workspaceId);
  }
}
```

---

## 步骤 5.2: 扩展 Container Service

更新 `packages/backend/src/services/container.service.ts` 添加统计方法:

```typescript
import Docker from 'dockerode';

interface ContainerStats {
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
}

export class ContainerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * 获取容器统计信息
   */
  async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(containerId);

    // 获取容器统计数据（流式）
    const statsStream = await container.stats({ stream: false });

    // 计算 CPU 使用率
    const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage -
                     statsStream.precpu_stats.cpu_usage.total_usage;
    const systemDelta = statsStream.cpu_stats.system_cpu_usage -
                        statsStream.precpu_stats.system_cpu_usage;
    const cpuUsage = (cpuDelta / systemDelta) *
                     statsStream.cpu_stats.online_cpus * 100;

    // 计算内存使用率
    const memoryUsage = (statsStream.memory_stats.usage /
                         statsStream.memory_stats.limit) * 100;

    // 网络统计
    const networks = statsStream.networks || {};
    let networkRx = 0;
    let networkTx = 0;

    Object.values(networks).forEach((net: any) => {
      networkRx += net.rx_bytes || 0;
      networkTx += net.tx_bytes || 0;
    });

    return {
      cpuUsage: isNaN(cpuUsage) ? 0 : cpuUsage,
      memoryUsage: isNaN(memoryUsage) ? 0 : memoryUsage,
      memoryLimit: statsStream.memory_stats.limit,
      networkRx,
      networkTx,
    };
  }

  // ... existing methods
}
```

---

## 步骤 5.3: 集成监控服务到路由

更新 `packages/backend/src/api/workspaces.routes.ts`:

```typescript
import { Router } from 'express';
import { WebSocketService } from '../services/websocket.service';
import { ContainerMonitorService } from '../services/container-monitor.service';
import { ContainerService } from '../services/container.service';

const router = Router();

// 在 app.ts 中初始化
// const wsService = app.get('wsService');
// const containerService = new ContainerService();
// const containerMonitor = new ContainerMonitorService(wsService, containerService);
// app.set('containerMonitor', containerMonitor);

/**
 * 启动工作区
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 启动容器
    const container = await containerService.startContainer(id);

    // 开始监控
    const containerMonitor = req.app.get('containerMonitor') as ContainerMonitorService;
    await containerMonitor.startMonitoring(id, container.id);

    res.json({
      success: true,
      data: { containerId: container.id, status: 'RUNNING' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 停止工作区
 */
router.post('/:id/stop', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 停止监控
    const containerMonitor = req.app.get('containerMonitor') as ContainerMonitorService;
    containerMonitor.stopMonitoring(id);

    // 停止容器
    await containerService.stopContainer(id);

    res.json({
      success: true,
      data: { status: 'STOPPED' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## 步骤 5.4: 前端容器统计组件

创建 `packages/frontend/src/components/workspace/ContainerStats.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, HardDrive, Network, AlertTriangle } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface ContainerStats {
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  status: string;
  timestamp: string;
}

interface ContainerWarning {
  warnings: string[];
  stats: ContainerStats;
}

interface ContainerStatsProps {
  workspaceId: string;
}

export default function ContainerStats({ workspaceId }: ContainerStatsProps) {
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 监听统计数据
  useWebSocketEvent<ContainerStats>('container:stats', (data) => {
    if (data.workspaceId === workspaceId) {
      setStats(data);
      setLastUpdate(new Date());
    }
  });

  // 监听警告
  useWebSocketEvent<ContainerWarning>('container:warning', (data) => {
    if (data.stats.workspaceId === workspaceId) {
      setWarnings(data.warnings);

      // 3 秒后清除警告
      setTimeout(() => setWarnings([]), 3000);
    }
  });

  // 监听错误
  useWebSocketEvent('container:error', (data) => {
    if (data.workspaceId === workspaceId) {
      console.error('[Container Error]', data.error);
    }
  });

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Activity className="mr-2 h-4 w-4 animate-pulse" />
            Loading container stats...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RUNNING':
        return 'default';
      case 'STOPPED':
        return 'secondary';
      case 'ERROR':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getCpuColor = (usage: number) => {
    if (usage > 80) return 'bg-red-500';
    if (usage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMemoryColor = (usage: number) => {
    if (usage > 90) return 'bg-red-500';
    if (usage > 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-4">
      {/* 警告提示 */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 统计卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Container Status
            </span>
            <Badge variant={getStatusColor(stats.status)}>
              {stats.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CPU 使用率 */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" />
                CPU Usage
              </span>
              <span className="font-medium font-mono">
                {stats.cpuUsage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={stats.cpuUsage}
              className="h-2"
              indicatorClassName={getCpuColor(stats.cpuUsage)}
            />
          </div>

          {/* 内存使用率 */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5" />
                Memory Usage
              </span>
              <span className="font-medium font-mono">
                {stats.memoryUsage.toFixed(1)}%
                <span className="text-xs text-muted-foreground ml-1">
                  / {formatBytes(stats.memoryLimit)}
                </span>
              </span>
            </div>
            <Progress
              value={stats.memoryUsage}
              className="h-2"
              indicatorClassName={getMemoryColor(stats.memoryUsage)}
            />
          </div>

          {/* 网络 I/O */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="flex items-center gap-2">
                <Network className="h-3.5 w-3.5" />
                Network I/O
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">RX:</span>
                <span className="font-mono">{formatBytes(stats.networkRx)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TX:</span>
                <span className="font-mono">{formatBytes(stats.networkTx)}</span>
              </div>
            </div>
          </div>

          {/* 最后更新时间 */}
          {lastUpdate && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 步骤 5.5: 添加格式化工具函数

更新 `packages/frontend/src/lib/utils.ts`:

```typescript
/**
 * 格式化字节数为人类可读格式
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
```

---

## Day 5-7 验证检查

```bash
# 1. 启动工作区并开始监控
curl -X POST http://localhost:8000/api/workspaces/:id/start \
  -H "Authorization: Bearer $TOKEN"

# 2. 检查前端容器统计显示
# 应该每 2 秒更新一次 CPU、内存、网络数据

# 3. 测试高负载场景
# 在容器内运行 CPU 密集型任务，观察是否触发警告

# 4. 检查 WebSocket 消息
# 打开浏览器控制台，查看 "container:stats" 事件
```

### 预期结果
- ✅ 容器统计数据每 2 秒更新
- ✅ CPU/内存使用率正确显示
- ✅ 高负载时触发警告
- ✅ 停止工作区后监控停止

---

# Day 8-10: 实时文件同步通知

## 目标
- 监听文件系统变更事件
- 通过 WebSocket 实时通知客户端
- 前端自动刷新文件树
- 实现文件冲突检测

---

## 步骤 8.1: 文件监听服务

创建 `packages/backend/src/services/file-watcher.service.ts`:

```typescript
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { WebSocketService } from './websocket.service';
import { logger } from '../utils/logger';
import { FileChangeEventData } from '../types/websocket.types';

export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();

  constructor(private wsService: WebSocketService) {}

  /**
   * 开始监听工作区文件变更
   */
  watchWorkspace(workspaceId: string, workspacePath: string): void {
    if (this.watchers.has(workspaceId)) {
      logger.warn(`Already watching workspace: ${workspaceId}`);
      return;
    }

    logger.info(`Starting file watcher for workspace: ${workspaceId}`);

    const watcher = chokidar.watch(workspacePath, {
      ignored: [
        /(^|[\/\\])\../, // 忽略隐藏文件
        '**/node_modules/**',
        '**/.git/**',
        '**/.cache/**',
        '**/dist/**',
        '**/build/**',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    // 文件添加
    watcher.on('add', (filePath: string) => {
      this.emitFileChange(workspaceId, 'created', filePath, workspacePath);
    });

    // 文件修改
    watcher.on('change', (filePath: string) => {
      this.emitFileChange(workspaceId, 'updated', filePath, workspacePath);
    });

    // 文件删除
    watcher.on('unlink', (filePath: string) => {
      this.emitFileChange(workspaceId, 'deleted', filePath, workspacePath);
    });

    // 文件/目录重命名（由 unlink + add 组成，需要特殊处理）
    // 这里使用简化逻辑，实际应该追踪 inode 变化

    // 错误处理
    watcher.on('error', (error) => {
      logger.error(`File watcher error for workspace ${workspaceId}:`, error);
    });

    this.watchers.set(workspaceId, watcher);
  }

  /**
   * 停止监听工作区
   */
  async unwatchWorkspace(workspaceId: string): Promise<void> {
    const watcher = this.watchers.get(workspaceId);

    if (watcher) {
      await watcher.close();
      this.watchers.delete(workspaceId);
      logger.info(`Stopped file watcher for workspace: ${workspaceId}`);
    }
  }

  /**
   * 发送文件变更事件
   */
  private emitFileChange(
    workspaceId: string,
    action: FileChangeEventData['action'],
    absolutePath: string,
    workspacePath: string
  ): void {
    // 计算相对路径
    const relativePath = path.relative(workspacePath, absolutePath);

    const eventData: FileChangeEventData = {
      workspaceId,
      action,
      path: relativePath,
      timestamp: new Date().toISOString(),
    };

    this.wsService.sendToWorkspace(workspaceId, 'file:changed', eventData);

    logger.debug(`File ${action}: ${relativePath} in workspace ${workspaceId}`);
  }

  /**
   * 停止所有监听
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all file watchers...');

    const closePromises = Array.from(this.watchers.entries()).map(
      async ([workspaceId, watcher]) => {
        await watcher.close();
        logger.debug(`Closed watcher for workspace: ${workspaceId}`);
      }
    );

    await Promise.all(closePromises);
    this.watchers.clear();
  }

  /**
   * 获取正在监听的工作区列表
   */
  getWatchedWorkspaces(): string[] {
    return Array.from(this.watchers.keys());
  }
}
```

---

## 步骤 8.2: 集成文件监听到 File Storage Service

更新 `packages/backend/src/services/file-storage.service.ts`:

```typescript
import { WebSocketService } from './websocket.service';
import { FileSystemAdapter } from '../adapters/file-system.adapter';

export class FileStorageService {
  constructor(
    private fileSystemAdapter: FileSystemAdapter,
    private wsService: WebSocketService
  ) {}

  /**
   * 上传文件
   */
  async uploadFile(
    workspaceId: string,
    filePath: string,
    content: string
  ): Promise<FileMetadata> {
    const metadata = await this.fileSystemAdapter.writeFile(
      workspaceId,
      filePath,
      content
    );

    // 通知所有连接的客户端（排除当前用户）
    this.wsService.sendToWorkspace(workspaceId, 'file:changed', {
      workspaceId,
      action: 'created',
      path: filePath,
      metadata: {
        size: metadata.size,
        mimeType: metadata.mimeType,
      },
      timestamp: new Date().toISOString(),
    });

    return metadata;
  }

  /**
   * 更新文件
   */
  async updateFile(
    workspaceId: string,
    filePath: string,
    content: string
  ): Promise<FileMetadata> {
    const metadata = await this.fileSystemAdapter.writeFile(
      workspaceId,
      filePath,
      content
    );

    this.wsService.sendToWorkspace(workspaceId, 'file:changed', {
      workspaceId,
      action: 'updated',
      path: filePath,
      metadata: {
        size: metadata.size,
        lastModified: metadata.lastModified,
      },
      timestamp: new Date().toISOString(),
    });

    return metadata;
  }

  /**
   * 删除文件
   */
  async deleteFile(workspaceId: string, filePath: string): Promise<void> {
    await this.fileSystemAdapter.deleteFile(workspaceId, filePath);

    this.wsService.sendToWorkspace(workspaceId, 'file:changed', {
      workspaceId,
      action: 'deleted',
      path: filePath,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 重命名文件
   */
  async renameFile(
    workspaceId: string,
    oldPath: string,
    newPath: string
  ): Promise<FileMetadata> {
    const metadata = await this.fileSystemAdapter.renameFile(
      workspaceId,
      oldPath,
      newPath
    );

    this.wsService.sendToWorkspace(workspaceId, 'file:changed', {
      workspaceId,
      action: 'renamed',
      path: newPath,
      oldPath,
      metadata,
      timestamp: new Date().toISOString(),
    });

    return metadata;
  }
}
```

---

## 步骤 8.3: 前端文件变更监听

更新 `packages/frontend/src/components/editor/FileExplorer.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useWebSocketEvent } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { FileChangeEventData } from '@/types/websocket';

interface FileExplorerProps {
  workspaceId: string;
}

export default function FileExplorer({ workspaceId }: FileExplorerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recentChanges, setRecentChanges] = useState<FileChangeEventData[]>([]);

  // 监听文件变更事件
  useWebSocketEvent<FileChangeEventData>('file:changed', (data) => {
    if (data.workspaceId !== workspaceId) return;

    // 刷新文件树
    queryClient.invalidateQueries({ queryKey: ['file-tree', workspaceId] });

    // 如果当前打开的文件被修改，刷新编辑器内容
    queryClient.invalidateQueries({ queryKey: ['file-content', workspaceId, data.path] });

    // 添加到最近变更列表
    setRecentChanges(prev => [data, ...prev].slice(0, 10));

    // 显示通知
    const actionText = {
      created: 'created',
      updated: 'updated',
      deleted: 'deleted',
      renamed: 'renamed',
    }[data.action];

    toast({
      title: 'File Changed',
      description: `${data.path} was ${actionText}`,
      duration: 2000,
    });
  });

  // ... rest of component
}
```

---

## 步骤 8.4: 文件冲突检测

创建 `packages/frontend/src/hooks/useFileConflictDetection.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useWebSocketEvent } from './useWebSocket';
import { useToast } from './use-toast';

interface FileConflictDetectionOptions {
  workspaceId: string;
  filePath: string;
  localVersion: string; // 本地版本的哈希值或时间戳
  onConflict?: (remoteChange: any) => void;
}

/**
 * 检测文件编辑冲突
 */
export function useFileConflictDetection({
  workspaceId,
  filePath,
  localVersion,
  onConflict,
}: FileConflictDetectionOptions) {
  const { toast } = useToast();
  const isEditingRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = true;

    return () => {
      isEditingRef.current = false;
    };
  }, []);

  useWebSocketEvent('file:changed', (data) => {
    if (
      data.workspaceId === workspaceId &&
      data.path === filePath &&
      data.action === 'updated' &&
      isEditingRef.current
    ) {
      // 检测到远程文件变更，且本地正在编辑
      toast({
        title: 'File Conflict Detected',
        description: `${filePath} was modified remotely while you were editing.`,
        variant: 'destructive',
        duration: 5000,
      });

      onConflict?.(data);
    }
  });
}
```

---

## Day 8-10 验证检查

```bash
# 1. 启动文件监听
# 在后端启动工作区时自动开始监听

# 2. 测试文件创建
# 在工作区内创建新文件，观察前端文件树是否自动更新

# 3. 测试文件修改
# 修改文件内容，检查是否收到 WebSocket 通知

# 4. 测试冲突检测
# 两个浏览器窗口同时编辑同一文件，观察冲突提示
```

### 预期结果
- ✅ 文件创建/修改/删除实时同步
- ✅ 文件树自动刷新
- ✅ 冲突检测正常工作
- ✅ 通知消息正确显示

---

# 总结

## Phase 5 完成清单

### 后端
- ✅ Socket.IO 服务器设置
- ✅ JWT 认证中间件
- ✅ 房间管理（用户房间、工作区房间）
- ✅ 容器监控服务
- ✅ 文件监听服务
- ✅ WebSocket 事件处理

### 前端
- ✅ Socket.IO 客户端管理器
- ✅ WebSocket Hooks (useWebSocket, useWebSocketEvent)
- ✅ WebSocket Store (Zustand)
- ✅ 容器统计显示组件
- ✅ 文件变更监听
- ✅ 冲突检测机制

### 功能验证
- ✅ 实时双向通信
- ✅ 自动重连机制
- ✅ 容器性能监控
- ✅ 文件同步通知
- ✅ 在线状态管理

## 下一步

Phase 6 将实现:
- Monaco Editor 高级功能（代码补全、语法高亮）
- 终端集成（xterm.js）
- Hook 系统
- 协作编辑（CRDT）

---

# 附录 A: 常见问题

### WebSocket 连接失败
- 检查 CORS 配置
- 验证 JWT Token 是否有效
- 确认防火墙/代理设置

### 监控数据不更新
- 检查容器是否正在运行
- 验证监控服务是否启动
- 查看后端日志错误信息

### 文件变更未同步
- 确认文件监听服务已启动
- 检查文件路径是否在忽略列表中
- 验证 WebSocket 连接状态

---

# 附录 B: 性能优化建议

### WebSocket 优化
- 使用二进制传输大数据
- 实现消息队列避免拥塞
- 启用消息压缩

### 监控优化
- 调整采集间隔（避免过于频繁）
- 实现数据聚合减少传输
- 使用增量更新而非全量

### 文件监听优化
- 合理配置忽略规则
- 使用防抖减少事件频率
- 批量处理多个文件变更

---

**Phase 5 完成！** 🎉