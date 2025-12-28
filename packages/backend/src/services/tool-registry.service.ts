import { ToolDefinition, FunctionCall } from '../adapters/types.js';
import { AdapterFactory } from '../adapters/factory.js';
import logger from '../utils/logger.js';

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

/**
 * 工具处理函数
 */
type ToolHandler = (
  workspaceId: string,
  args: Record<string, unknown>
) => Promise<unknown>;

/**
 * 工具注册表
 * 管理可用工具和工具执行
 */
export class ToolRegistry {
  private tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * 注册默认工具
   */
  private registerDefaultTools(): void {
    // 文件读取工具
    this.register(
      {
        name: 'read_file',
        description: 'Read the contents of a file in the workspace',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to read',
            },
          },
          required: ['path'],
        },
      },
      async (workspaceId, args) => {
        const fs = AdapterFactory.getFileSystemAdapter();
        return await fs.readFile(workspaceId, args.path as string);
      }
    );

    // 文件写入工具
    this.register(
      {
        name: 'write_file',
        description: 'Write content to a file in the workspace',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to write',
            },
            content: {
              type: 'string',
              description: 'The content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      async (workspaceId, args) => {
        const fs = AdapterFactory.getFileSystemAdapter();
        await fs.writeFile(workspaceId, args.path as string, args.content as string);
        return { success: true, path: args.path };
      }
    );

    // 文件编辑工具
    this.register(
      {
        name: 'edit_file',
        description: 'Edit a file by replacing specific text',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to edit',
            },
            old_text: {
              type: 'string',
              description: 'The text to replace',
            },
            new_text: {
              type: 'string',
              description: 'The replacement text',
            },
          },
          required: ['path', 'old_text', 'new_text'],
        },
      },
      async (workspaceId, args) => {
        const fs = AdapterFactory.getFileSystemAdapter();
        await fs.editFile(workspaceId, args.path as string, [
          { oldText: args.old_text as string, newText: args.new_text as string },
        ]);
        return { success: true, path: args.path };
      }
    );

    // 文件列表工具
    this.register(
      {
        name: 'list_files',
        description: 'List files in the workspace',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Optional glob pattern to filter files',
            },
          },
        },
      },
      async (workspaceId, args) => {
        const fs = AdapterFactory.getFileSystemAdapter();
        return await fs.listFiles(workspaceId, args.pattern as string | undefined);
      }
    );

    // Shell 执行工具
    this.register(
      {
        name: 'run_command',
        description: 'Run a shell command in the workspace',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to execute',
            },
            cwd: {
              type: 'string',
              description: 'Working directory for the command',
            },
          },
          required: ['command'],
        },
      },
      async (workspaceId, args) => {
        const shell = AdapterFactory.getShellAdapter();
        const output: string[] = [];

        for await (const chunk of shell.execute(workspaceId, args.command as string, {
          cwd: args.cwd as string | undefined,
        })) {
          if (chunk.type === 'stdout' || chunk.type === 'stderr') {
            output.push(chunk.data as string);
          }
        }

        return { output: output.join('') };
      }
    );

    // Web 抓取工具
    this.register(
      {
        name: 'web_fetch',
        description: 'Fetch content from a URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch',
            },
          },
          required: ['url'],
        },
      },
      async (_workspaceId, args) => {
        const web = AdapterFactory.getWebToolsAdapter();
        return await web.fetch(args.url as string);
      }
    );

    // Web 搜索工具
    this.register(
      {
        name: 'web_search',
        description: 'Search the web',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
            },
          },
          required: ['query'],
        },
      },
      async (_workspaceId, args) => {
        const web = AdapterFactory.getWebToolsAdapter();
        return await web.search(args.query as string, {
          limit: args.limit as number | undefined,
        });
      }
    );
  }

  /**
   * 注册工具
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
    logger.debug('Tool registered', { name: definition.name });
  }

  /**
   * 获取所有工具定义
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * 检查工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 执行工具
   */
  async execute(
    workspaceId: string,
    functionCall: FunctionCall
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    const tool = this.tools.get(functionCall.name);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${functionCall.name}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      logger.info('Executing tool', {
        name: functionCall.name,
        workspaceId,
        args: functionCall.args,
      });

      const output = await tool.handler(workspaceId, functionCall.args);

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Tool execution failed', {
        name: functionCall.name,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry();
