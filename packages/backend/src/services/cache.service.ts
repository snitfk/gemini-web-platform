import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache options
 */
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * In-memory cache implementation (fallback when Redis is not available)
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2;

    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  close(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * CacheService
 * Provides caching functionality with Redis or in-memory fallback
 */
export class CacheService {
  private memoryCache: MemoryCache;
  private defaultTTL: number;
  private prefix: string;

  constructor(options: CacheOptions = {}) {
    this.memoryCache = new MemoryCache();
    this.defaultTTL = options.ttl || 300; // Default 5 minutes
    this.prefix = options.prefix || 'gemini:';

    logger.info('Cache service initialized (in-memory mode)', {
      defaultTTL: this.defaultTTL,
      prefix: this.prefix,
    });
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      return await this.memoryCache.get<T>(fullKey);
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      const ttl = ttlSeconds || this.defaultTTL;
      await this.memoryCache.set(fullKey, value, ttl);
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.memoryCache.del(fullKey);
    } catch (error) {
      logger.error('Cache del error', { key, error });
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern);
      return await this.memoryCache.delPattern(fullPattern);
    } catch (error) {
      logger.error('Cache delPattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      return await this.memoryCache.exists(fullKey);
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.memoryCache.ttl(fullKey);
    } catch (error) {
      logger.error('Cache ttl error', { key, error });
      return -2;
    }
  }

  /**
   * Get or set value with callback
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.memoryCache.clear();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }

  /**
   * Close cache connections
   */
  close(): void {
    this.memoryCache.close();
    logger.info('Cache service closed');
  }

  /**
   * Cache decorator for service methods
   */
  static cached<T>(
    keyGenerator: (...args: unknown[]) => string,
    ttlSeconds?: number
  ) {
    return function (
      _target: unknown,
      _propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: unknown[]) {
        const key = keyGenerator(...args);
        const cached = await cacheService.get<T>(key);

        if (cached !== null) {
          return cached;
        }

        const result = await originalMethod.apply(this, args);
        await cacheService.set(key, result, ttlSeconds);
        return result;
      };

      return descriptor;
    };
  }
}

// Cache key generators
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  workspaceList: (userId: string) => `workspaces:${userId}`,
  file: (workspaceId: string, path: string) => `file:${workspaceId}:${path}`,
  fileList: (workspaceId: string) => `files:${workspaceId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  rateLimit: (key: string) => `ratelimit:${key}`,
};

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 1 day
};

// Export singleton instance
export const cacheService = new CacheService({
  ttl: CacheTTL.MEDIUM,
  prefix: config.cache?.prefix || 'gemini:',
});
