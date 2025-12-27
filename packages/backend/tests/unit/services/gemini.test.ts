import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService, GeminiClientManager } from '../../../src/services/gemini.service.js';

// Mock the @google/generative-ai module
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        startChat: vi.fn().mockReturnValue({
          sendMessageStream: vi.fn().mockResolvedValue({
            stream: (async function* () {
              yield {
                text: () => 'Hello, ',
                functionCalls: () => null,
              };
              yield {
                text: () => 'I am Gemini!',
                functionCalls: () => null,
              };
            })(),
          }),
        }),
      }),
    })),
  };
});

describe('GeminiService', () => {
  describe('constructor', () => {
    it('should initialize with API key', () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });
      expect(service).toBeInstanceOf(GeminiService);
    });

    it('should initialize with custom model', () => {
      const service = new GeminiService({
        apiKey: 'test-api-key',
        model: 'gemini-1.5-pro',
      });
      expect(service).toBeInstanceOf(GeminiService);
    });

    it('should initialize with tools', () => {
      const service = new GeminiService({
        apiKey: 'test-api-key',
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
      });
      expect(service).toBeInstanceOf(GeminiService);
    });
  });

  describe('sendMessageStream', () => {
    it('should yield content events', async () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });
      const events: Array<{ type: string }> = [];

      for await (const event of service.sendMessageStream('Hello')) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);

      const contentEvents = events.filter(e => e.type === 'content');
      expect(contentEvents.length).toBeGreaterThan(0);

      const doneEvent = events.find(e => e.type === 'done');
      expect(doneEvent).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should return complete response', async () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });
      const response = await service.sendMessage('Hello');

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('history management', () => {
    it('should maintain conversation history', async () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });

      await service.sendMessage('Hello');
      const history = service.getHistory();

      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].role).toBe('user');
    });

    it('should clear history', async () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });

      await service.sendMessage('Hello');
      service.clearHistory();

      const history = service.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('setTools', () => {
    it('should update tools configuration', () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });

      service.setTools([
        {
          name: 'new_tool',
          description: 'A new tool',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      // No error should be thrown
      expect(service).toBeInstanceOf(GeminiService);
    });
  });

  describe('submitToolResult', () => {
    it('should add tool result to history', async () => {
      const service = new GeminiService({ apiKey: 'test-api-key' });

      await service.submitToolResult(
        { name: 'test_tool', args: { input: 'test' } },
        { result: 'success' }
      );

      const history = service.getHistory();
      // History should contain function call and response
      expect(history.length).toBeGreaterThan(0);
    });
  });
});

describe('GeminiClientManager', () => {
  beforeEach(() => {
    GeminiClientManager.clearAll();
  });

  it('should create new client for user/workspace', () => {
    const client = GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    expect(client).toBeInstanceOf(GeminiService);
  });

  it('should return same client for same user/workspace', () => {
    const client1 = GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    const client2 = GeminiClientManager.getClient('user1', 'workspace1');

    expect(client1).toBe(client2);
  });

  it('should return different clients for different workspaces', () => {
    const client1 = GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    const client2 = GeminiClientManager.getClient('user1', 'workspace2', {
      apiKey: 'test-api-key',
    });

    expect(client1).not.toBe(client2);
  });

  it('should remove client', () => {
    GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    GeminiClientManager.removeClient('user1', 'workspace1');

    // Getting client again should create a new one
    const newClient = GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    expect(newClient).toBeInstanceOf(GeminiService);
  });

  it('should clear all clients', () => {
    GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });
    GeminiClientManager.getClient('user2', 'workspace2', {
      apiKey: 'test-api-key',
    });

    GeminiClientManager.clearAll();

    // All clients should be cleared
    // Next getClient call should create new instances
    const client = GeminiClientManager.getClient('user1', 'workspace1', {
      apiKey: 'test-api-key',
    });

    expect(client).toBeInstanceOf(GeminiService);
  });
});
