import { WebToolsAdapter, FetchOptions, SearchOptions, SearchResult } from '../types.js';
import logger from '../../utils/logger.js';

/**
 * Web 工具适配器实现
 * 提供 HTTP 请求和网页搜索功能
 */
export class WebToolsAdapterImpl implements WebToolsAdapter {
  private readonly defaultTimeout = 30000; // 30 秒

  /**
   * 抓取 URL 内容
   */
  async fetch(url: string, options?: FetchOptions): Promise<string> {
    logger.info('Fetching URL', { url, method: options?.method || 'GET' });

    try {
      const controller = new AbortController();
      const timeout = options?.timeout || this.defaultTimeout;

      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await globalThis.fetch(url, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // 根据内容类型处理响应
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return JSON.stringify(json, null, 2);
      } else if (contentType.includes('text/html')) {
        const html = await response.text();
        // 简单的 HTML 清理，提取文本内容
        return this.extractTextFromHtml(html);
      } else {
        return await response.text();
      }
    } catch (error) {
      logger.error('Fetch error', { url, error });

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${options?.timeout || this.defaultTimeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown fetch error');
    }
  }

  /**
   * 网页搜索
   * 注意: 这是一个模拟实现，生产环境需要集成实际的搜索 API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    logger.info('Web search', { query, limit: options?.limit });

    // 在生产环境中，这里应该调用实际的搜索 API（如 Google、Bing 等）
    // 目前返回模拟结果

    const limit = options?.limit || 5;

    // 模拟搜索结果
    const mockResults: SearchResult[] = [
      {
        title: `Search result 1 for: ${query}`,
        url: `https://example.com/result1?q=${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for "${query}". In production, this would be a real search result.`,
      },
      {
        title: `Search result 2 for: ${query}`,
        url: `https://example.com/result2?q=${encodeURIComponent(query)}`,
        snippet: `Another mock search result related to "${query}". Integrate with a real search API for production use.`,
      },
      {
        title: `Documentation about ${query}`,
        url: `https://docs.example.com/${encodeURIComponent(query)}`,
        snippet: `Official documentation and guides for ${query}.`,
      },
    ];

    return mockResults.slice(0, limit);
  }

  /**
   * 从 HTML 中提取文本内容
   */
  private extractTextFromHtml(html: string): string {
    // 移除 script 和 style 标签及其内容
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // 移除所有 HTML 标签
    text = text.replace(/<[^>]+>/g, ' ');

    // 解码 HTML 实体
    text = this.decodeHtmlEntities(text);

    // 清理空白字符
    text = text.replace(/\s+/g, ' ').trim();

    // 限制长度
    const maxLength = 50000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text;
  }

  /**
   * 解码 HTML 实体
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[^;]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }
}
