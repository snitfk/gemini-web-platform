// Prisma client types placeholder
// This file provides type definitions when Prisma client is not generated

declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: unknown);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(event: string, callback: (e: unknown) => void): void;

    user: UserDelegate;
    refreshToken: RefreshTokenDelegate;
    workspace: WorkspaceDelegate;
    file: FileDelegate;
    chatSession: ChatSessionDelegate;
    message: MessageDelegate;
    toolExecution: ToolExecutionDelegate;
  }

  interface UserDelegate {
    findUnique(args: unknown): Promise<User | null>;
    findMany(args?: unknown): Promise<User[]>;
    create(args: unknown): Promise<User>;
    update(args: unknown): Promise<User>;
    delete(args: unknown): Promise<User>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
    count(args?: unknown): Promise<number>;
  }

  interface RefreshTokenDelegate {
    findUnique(args: unknown): Promise<RefreshToken | null>;
    create(args: unknown): Promise<RefreshToken>;
    delete(args: unknown): Promise<RefreshToken>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
  }

  interface WorkspaceDelegate {
    findUnique(args: unknown): Promise<Workspace | null>;
    findFirst(args: unknown): Promise<Workspace | null>;
    findMany(args?: unknown): Promise<Workspace[]>;
    create(args: unknown): Promise<Workspace>;
    update(args: unknown): Promise<Workspace>;
    delete(args: unknown): Promise<Workspace>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
    count(args?: unknown): Promise<number>;
  }

  interface FileDelegate {
    findUnique(args: unknown): Promise<File | null>;
    findMany(args?: unknown): Promise<File[]>;
    create(args: unknown): Promise<File>;
    update(args: unknown): Promise<File>;
    delete(args: unknown): Promise<File>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
    count(args?: unknown): Promise<number>;
  }

  interface ChatSessionDelegate {
    findUnique(args: unknown): Promise<ChatSession | null>;
    findFirst(args: unknown): Promise<ChatSession | null>;
    findMany(args?: unknown): Promise<ChatSession[]>;
    create(args: unknown): Promise<ChatSession>;
    update(args: unknown): Promise<ChatSession>;
    delete(args: unknown): Promise<ChatSession>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
    count(args?: unknown): Promise<number>;
  }

  interface MessageDelegate {
    findMany(args?: unknown): Promise<Message[]>;
    create(args: unknown): Promise<Message>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
  }

  interface ToolExecutionDelegate {
    findMany(args?: unknown): Promise<ToolExecution[]>;
    create(args: unknown): Promise<ToolExecution>;
    deleteMany(args?: unknown): Promise<{ count: number }>;
  }

  interface User {
    id: string;
    email: string;
    username: string;
    passwordHash: string | null;
    oauthProvider: string | null;
    oauthId: string | null;
    displayName: string | null;
    avatar: string | null;
    geminiApiKey: string | null;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  interface RefreshToken {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    user?: User;
  }

  interface Workspace {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    status: WorkspaceStatus;
    containerId: string | null;
    storageUsed: number;
    config: unknown;
    settings: unknown;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  type WorkspaceStatus = 'active' | 'archived' | 'deleted';

  interface File {
    id: string;
    workspaceId: string;
    name: string;
    path: string;
    mimeType: string;
    size: number;
    storageKey: string;
    createdAt: Date;
    updatedAt: Date;
  }

  interface ChatSession {
    id: string;
    userId: string;
    workspaceId: string;
    title: string;
    summary: string | null;
    model: string;
    temperature: number;
    maxTokens: number;
    createdAt: Date;
    updatedAt: Date;
  }

  interface Message {
    id: string;
    chatSessionId: string;
    role: MessageRole;
    content: string;
    metadata: unknown;
    promptTokens: number | null;
    completionTokens: number | null;
    createdAt: Date;
  }

  interface ToolExecution {
    id: string;
    messageId: string;
    toolName: string;
    toolInput: unknown;
    toolOutput: unknown | null;
    status: ExecutionStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    duration: number | null;
    error: string | null;
    createdAt: Date;
  }

  enum MessageRole {
    user = 'user',
    assistant = 'assistant',
    system = 'system',
    tool = 'tool',
  }

  enum ExecutionStatus {
    pending = 'pending',
    running = 'running',
    completed = 'completed',
    failed = 'failed',
    cancelled = 'cancelled',
  }

  export namespace Prisma {
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: { target?: string[] };
    }
  }
}
