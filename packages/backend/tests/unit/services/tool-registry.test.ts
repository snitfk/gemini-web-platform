import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../../../src/services/tool-registry.service.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should have default tools registered', () => {
      const tools = registry.getToolDefinitions();

      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('edit_file');
      expect(toolNames).toContain('list_files');
      expect(toolNames).toContain('run_command');
      expect(toolNames).toContain('web_fetch');
      expect(toolNames).toContain('web_search');
    });

    it('should register custom tool', () => {
      const customTool = {
        name: 'custom_tool',
        description: 'A custom test tool',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input value' },
          },
          required: ['input'],
        },
      };

      registry.register(customTool, async (_workspaceId, args) => {
        return { result: `Processed: ${args.input}` };
      });

      expect(registry.hasTool('custom_tool')).toBe(true);

      const tools = registry.getToolDefinitions();
      const registered = tools.find(t => t.name === 'custom_tool');
      expect(registered).toBeDefined();
      expect(registered?.description).toBe('A custom test tool');
    });

    it('should check if tool exists', () => {
      expect(registry.hasTool('read_file')).toBe(true);
      expect(registry.hasTool('nonexistent_tool')).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    it('should execute registered tool successfully', async () => {
      registry.register(
        {
          name: 'test_tool',
          description: 'Test tool for unit tests',
          parameters: {
            type: 'object',
            properties: {
              value: { type: 'string' },
            },
            required: ['value'],
          },
        },
        async (_workspaceId, args) => {
          return { output: `Got: ${args.value}` };
        }
      );

      const result = await registry.execute('test-workspace', {
        name: 'test_tool',
        args: { value: 'hello' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ output: 'Got: hello' });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return error for unknown tool', async () => {
      const result = await registry.execute('test-workspace', {
        name: 'unknown_tool',
        args: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown tool: unknown_tool');
    });

    it('should handle tool execution errors', async () => {
      registry.register(
        {
          name: 'failing_tool',
          description: 'Tool that always fails',
          parameters: { type: 'object', properties: {} },
        },
        async () => {
          throw new Error('Tool execution failed');
        }
      );

      const result = await registry.execute('test-workspace', {
        name: 'failing_tool',
        args: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
    });

    it('should track execution duration', async () => {
      registry.register(
        {
          name: 'slow_tool',
          description: 'Tool with delay',
          parameters: { type: 'object', properties: {} },
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { done: true };
        }
      );

      const result = await registry.execute('test-workspace', {
        name: 'slow_tool',
        args: {},
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Tool Definitions', () => {
    it('should return all tool definitions', () => {
      const tools = registry.getToolDefinitions();

      expect(Array.isArray(tools)).toBe(true);

      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      }
    });

    it('should have valid parameter schemas for default tools', () => {
      const tools = registry.getToolDefinitions();

      const readFileTool = tools.find(t => t.name === 'read_file');
      expect(readFileTool?.parameters.properties).toHaveProperty('path');
      expect(readFileTool?.parameters.required).toContain('path');

      const writeFileTool = tools.find(t => t.name === 'write_file');
      expect(writeFileTool?.parameters.properties).toHaveProperty('path');
      expect(writeFileTool?.parameters.properties).toHaveProperty('content');
      expect(writeFileTool?.parameters.required).toContain('path');
      expect(writeFileTool?.parameters.required).toContain('content');
    });
  });
});
