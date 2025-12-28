import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  FunctionDeclaration,
  Tool,
  GenerateContentStreamResult,
} from '@google/generative-ai';
import { config } from '../config/index.js';
import { ChatEvent, GenerationConfig, ToolDefinition, FunctionCall } from '../adapters/types.js';
import logger from '../utils/logger.js';

/**
 * Gemini 客户端配置
 */
export interface GeminiClientConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  tools?: ToolDefinition[];
  generationConfig?: GenerationConfig;
}

/**
 * 消息格式
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Gemini API 服务
 * 封装与 Google Generative AI API 的交互
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private history: Content[] = [];
  private tools: Tool[] = [];

  constructor(clientConfig?: Partial<GeminiClientConfig>) {
    const apiKey = clientConfig?.apiKey || config.gemini.apiKey;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // 转换工具定义
    if (clientConfig?.tools) {
      this.tools = this.convertToolDefinitions(clientConfig.tools);
    }

    // 初始化模型
    this.model = this.genAI.getGenerativeModel({
      model: clientConfig?.model || 'gemini-2.0-flash-exp',
      systemInstruction: clientConfig?.systemInstruction || this.getDefaultSystemInstruction(),
      tools: this.tools.length > 0 ? this.tools : undefined,
      generationConfig: clientConfig?.generationConfig ? {
        temperature: clientConfig.generationConfig.temperature,
        topP: clientConfig.generationConfig.topP,
        topK: clientConfig.generationConfig.topK,
        maxOutputTokens: clientConfig.generationConfig.maxOutputTokens,
        stopSequences: clientConfig.generationConfig.stopSequences,
      } : undefined,
    });
  }

  /**
   * 发送消息并获取流式响应
   */
  async *sendMessageStream(message: string): AsyncGenerator<ChatEvent> {
    try {
      // 添加用户消息到历史
      this.history.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // 创建聊天会话
      const chat = this.model.startChat({
        history: this.history.slice(0, -1), // 不包括刚添加的消息
      });

      // 发送消息并获取流式响应
      const result: GenerateContentStreamResult = await chat.sendMessageStream(message);

      let fullText = '';

      // 处理流式响应
      for await (const chunk of result.stream) {
        const text = chunk.text();

        if (text) {
          fullText += text;
          yield { type: 'content', content: text };
        }

        // 检查是否有函数调用
        const functionCalls = chunk.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          for (const fc of functionCalls) {
            yield {
              type: 'tool_call',
              toolCall: {
                name: fc.name,
                args: fc.args as Record<string, unknown>,
              },
            };
          }
        }
      }

      // 添加模型响应到历史
      if (fullText) {
        this.history.push({
          role: 'model',
          parts: [{ text: fullText }],
        });
      }

      yield { type: 'done' };
    } catch (error) {
      logger.error('Gemini API error', { error });

      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown Gemini API error',
      };
    }
  }

  /**
   * 发送消息并等待完整响应
   */
  async sendMessage(message: string): Promise<string> {
    let fullResponse = '';

    for await (const event of this.sendMessageStream(message)) {
      if (event.type === 'content' && event.content) {
        fullResponse += event.content;
      } else if (event.type === 'error') {
        throw new Error(event.error);
      }
    }

    return fullResponse;
  }

  /**
   * 提交工具执行结果
   */
  async submitToolResult(functionCall: FunctionCall, result: unknown): Promise<void> {
    // 添加函数响应到历史
    this.history.push({
      role: 'model',
      parts: [{
        functionCall: {
          name: functionCall.name,
          args: functionCall.args,
        },
      }],
    });

    this.history.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name: functionCall.name,
          response: result as object,
        },
      }],
    });
  }

  /**
   * 获取对话历史
   */
  getHistory(): ChatMessage[] {
    return this.history.map((content) => ({
      role: content.role as 'user' | 'model',
      content: content.parts
        .filter((part): part is { text: string } => 'text' in part)
        .map((part) => part.text)
        .join(''),
    }));
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 设置工具
   */
  setTools(tools: ToolDefinition[]): void {
    this.tools = this.convertToolDefinitions(tools);

    // 重新创建模型以应用新工具
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: this.getDefaultSystemInstruction(),
      tools: this.tools.length > 0 ? this.tools : undefined,
    });
  }

  /**
   * 转换工具定义为 Gemini 格式
   */
  private convertToolDefinitions(tools: ToolDefinition[]): Tool[] {
    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as FunctionDeclaration['parameters'],
    }));

    return [{ functionDeclarations }];
  }

  /**
   * 获取默认系统指令
   */
  private getDefaultSystemInstruction(): string {
    return `You are Gemini, an AI assistant integrated into a web-based development platform.
You can help users with:
- Writing and editing code
- Explaining programming concepts
- Debugging and troubleshooting
- File operations in their workspace
- Running shell commands
- Web searches and fetching content

Always be helpful, accurate, and concise in your responses.
When working with code, provide clear explanations and follow best practices.`;
  }
}

/**
 * Gemini 客户端管理器
 * 为每个用户/工作区维护独立的 GeminiService 实例
 */
export class GeminiClientManager {
  private static clients = new Map<string, GeminiService>();

  /**
   * 获取或创建客户端
   */
  static getClient(
    userId: string,
    workspaceId: string,
    config?: Partial<GeminiClientConfig>
  ): GeminiService {
    const key = `${userId}:${workspaceId}`;

    if (!this.clients.has(key)) {
      logger.info('Creating new GeminiService', { userId, workspaceId });
      this.clients.set(key, new GeminiService(config));
    }

    return this.clients.get(key)!;
  }

  /**
   * 移除客户端
   */
  static removeClient(userId: string, workspaceId: string): void {
    const key = `${userId}:${workspaceId}`;
    this.clients.delete(key);
    logger.info('Removed GeminiService', { userId, workspaceId });
  }

  /**
   * 清理所有客户端
   */
  static clearAll(): void {
    this.clients.clear();
    logger.info('Cleared all GeminiService instances');
  }
}
