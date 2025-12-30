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

  private apiKey: string;
  private baseUrl: string;

  constructor(clientConfig?: Partial<GeminiClientConfig>) {
    this.apiKey = clientConfig?.apiKey || config.gemini.apiKey;

    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }

    // 使用自定义的 Gemini API 代理地址或默认地址
    this.baseUrl = config.gemini.baseUrl || 'https://generativelanguage.googleapis.com';

    this.genAI = new GoogleGenerativeAI(this.apiKey);

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

      // 如果使用自定义 baseUrl,使用直接的 HTTP 请求
      if (config.gemini.baseUrl) {
        yield* this.sendMessageStreamDirect(message);
        return;
      }

      // 否则使用 Google SDK
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
   * 使用直接 HTTP 请求发送消息(用于自定义 baseUrl)
   */
  private async *sendMessageStreamDirect(message: string): AsyncGenerator<ChatEvent> {
    try {
      const model = 'gemini-2.0-flash-exp';
      const url = `${this.baseUrl}/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}`;

      // 准备请求体
      const requestBody = {
        contents: this.history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };

      logger.info('Calling Gemini API', { url, baseUrl: this.baseUrl });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      logger.info('Gemini API response received', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error response', { status: response.status, body: errorText });
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let inArray = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 检测数组开始
        if (!inArray && buffer.trimStart().startsWith('[')) {
          inArray = true;
          buffer = buffer.trimStart().slice(1); // 移除开头的 [
        }

        // 处理缓冲区中的 JSON 对象
        while (buffer.length > 0) {
          const trimmed = buffer.trimStart();

          // 跳过逗号和空白
          if (trimmed.startsWith(',')) {
            buffer = trimmed.slice(1);
            continue;
          }

          // 检查是否是数组结束
          if (trimmed.startsWith(']')) {
            buffer = trimmed.slice(1);
            break;
          }

          // 尝试提取并解析一个 JSON 对象
          let braceCount = 0;
          let inString = false;
          let escaped = false;
          let jsonEnd = -1;

          for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];

            if (escaped) {
              escaped = false;
              continue;
            }

            if (char === '\\') {
              escaped = true;
              continue;
            }

            if (char === '"') {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
          }

          if (jsonEnd > 0) {
            const jsonStr = trimmed.substring(0, jsonEnd);
            buffer = trimmed.substring(jsonEnd);

            try {
              const parsed = JSON.parse(jsonStr);
              logger.debug('Parsed Gemini response chunk', { parsed });
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                logger.debug('Yielding content chunk', { textLength: text.length });
                yield { type: 'content', content: text };
              }
            } catch (e) {
              logger.error('Failed to parse JSON chunk', { error: e, jsonStr: jsonStr.substring(0, 100) });
            }
          } else {
            // 没有完整的 JSON 对象,等待更多数据
            break;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Gemini API direct request error', {
        message: errorMessage,
        stack: errorStack,
        error: error
      });
      yield {
        type: 'error',
        error: errorMessage,
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
