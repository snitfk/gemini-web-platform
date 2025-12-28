/**
 * 工具适配器基础接口
 */
export interface ToolAdapter<TParams = unknown, TResult = unknown> {
  /**
   * 执行工具
   */
  execute(params: TParams): Promise<TResult>;

  /**
   * 验证参数
   */
  validate?(params: TParams): Promise<boolean>;

  /**
   * 获取工具名称
   */
  getName(): string;
}

/**
 * 异步流式适配器
 */
export interface StreamingToolAdapter<TParams = unknown, TChunk = unknown>
  extends ToolAdapter<TParams, AsyncIterable<TChunk>> {
  /**
   * 流式执行
   */
  executeStream(params: TParams): AsyncIterable<TChunk>;
}

/**
 * 文件编辑操作
 */
export interface FileEdit {
  oldText: string;
  newText: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: Date;
}

/**
 * 文件系统适配器接口
 */
export interface FileSystemAdapter {
  readFile(workspaceId: string, path: string): Promise<string>;
  writeFile(workspaceId: string, path: string, content: string): Promise<void>;
  editFile(workspaceId: string, path: string, edits: FileEdit[]): Promise<void>;
  listFiles(workspaceId: string, pattern?: string): Promise<FileInfo[]>;
  deleteFile(workspaceId: string, path: string): Promise<void>;
  fileExists(workspaceId: string, path: string): Promise<boolean>;
  createDirectory(workspaceId: string, path: string): Promise<void>;
}

/**
 * Shell 执行选项
 */
export interface ShellExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Shell 输出
 */
export interface ShellOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string | number;
}

/**
 * Shell 适配器接口
 */
export interface ShellAdapter {
  execute(
    workspaceId: string,
    command: string,
    options?: ShellExecuteOptions
  ): AsyncIterable<ShellOutput>;

  kill(workspaceId: string, processId: string): Promise<void>;
}

/**
 * Web Fetch 选项
 */
export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  limit?: number;
  language?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Web 工具适配器接口
 */
export interface WebToolsAdapter {
  fetch(url: string, options?: FetchOptions): Promise<string>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

/**
 * Gemini 消息角色
 */
export type MessageRole = 'user' | 'model' | 'system';

/**
 * Gemini 消息内容
 */
export interface MessageContent {
  role: MessageRole;
  parts: Array<{ text: string } | { functionCall: FunctionCall } | { functionResponse: FunctionResponse }>;
}

/**
 * 函数调用
 */
export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * 函数响应
 */
export interface FunctionResponse {
  name: string;
  response: unknown;
}

/**
 * Chat 事件类型
 */
export interface ChatEvent {
  type: 'content' | 'tool_call' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolCall?: FunctionCall;
  toolResult?: FunctionResponse;
  thinking?: string;
  error?: string;
}

/**
 * Gemini 生成配置
 */
export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

/**
 * 工具定义
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
