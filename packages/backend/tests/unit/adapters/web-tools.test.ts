import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebToolsAdapterImpl } from '../../../src/adapters/web/web.adapter.js';

describe('WebToolsAdapterImpl', () => {
  let adapter: WebToolsAdapterImpl;

  beforeEach(() => {
    adapter = new WebToolsAdapterImpl();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetch', () => {
    it('should have fetch method', () => {
      expect(typeof adapter.fetch).toBe('function');
    });

    it('should fetch and return text content', async () => {
      const mockResponse = new Response('Test content', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      const result = await adapter.fetch('https://example.com');

      expect(result).toBe('Test content');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle JSON response', async () => {
      const mockResponse = new Response(JSON.stringify({ key: 'value' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      const result = await adapter.fetch('https://api.example.com/data');

      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    it('should handle HTML response and extract text', async () => {
      const html = '<html><body><p>Hello World</p></body></html>';
      const mockResponse = new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      const result = await adapter.fetch('https://example.com');

      expect(result).toContain('Hello World');
    });

    it('should throw error for non-OK response', async () => {
      const mockResponse = new Response('Not Found', {
        status: 404,
        statusText: 'Not Found',
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      await expect(adapter.fetch('https://example.com/notfound')).rejects.toThrow(
        'HTTP 404: Not Found'
      );
    });
  });

  describe('search', () => {
    it('should return search results array', async () => {
      const results = await adapter.search('TypeScript tutorial');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return results with expected structure', async () => {
      const results = await adapter.search('Node.js best practices');

      for (const item of results) {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('snippet');
        expect(typeof item.title).toBe('string');
        expect(typeof item.url).toBe('string');
        expect(typeof item.snippet).toBe('string');
      }
    });

    it('should respect limit option', async () => {
      const results = await adapter.search('JavaScript', { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should include query in result content', async () => {
      const query = 'React';
      const results = await adapter.search(query);

      // Mock results contain the query
      const hasQuery = results.some(
        r => r.title.toLowerCase().includes(query.toLowerCase()) ||
             r.snippet.toLowerCase().includes(query.toLowerCase())
      );
      expect(hasQuery).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should create adapter without configuration', () => {
      const newAdapter = new WebToolsAdapterImpl();
      expect(newAdapter).toBeInstanceOf(WebToolsAdapterImpl);
    });
  });
});
