import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  getPaginationParams,
  createPaginationMeta,
} from '../../../src/utils/pagination.js';

describe('Pagination Utils', () => {
  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.parse({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('should parse valid values', () => {
      const result = paginationSchema.parse({
        page: '2',
        limit: '50',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('asc');
    });

    it('should enforce max limit', () => {
      expect(() => paginationSchema.parse({ limit: '200' })).toThrow();
    });
  });

  describe('getPaginationParams', () => {
    it('should calculate skip and take correctly', () => {
      const query = { page: 3, limit: 10, sortOrder: 'desc' as const };
      const params = getPaginationParams(query);

      expect(params.skip).toBe(20);
      expect(params.take).toBe(10);
    });

    it('should include orderBy for allowed sort fields', () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };
      const params = getPaginationParams(query, ['name', 'createdAt']);

      expect(params.orderBy).toEqual({ name: 'asc' });
    });

    it('should not include orderBy for disallowed sort fields', () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'password',
        sortOrder: 'asc' as const,
      };
      const params = getPaginationParams(query, ['name', 'createdAt']);

      expect(params.orderBy).toBeUndefined();
    });
  });

  describe('createPaginationMeta', () => {
    it('should calculate totalPages correctly', () => {
      const meta = createPaginationMeta(1, 10, 95);

      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(95);
      expect(meta.totalPages).toBe(10);
    });

    it('should handle zero total', () => {
      const meta = createPaginationMeta(1, 10, 0);

      expect(meta.totalPages).toBe(0);
    });
  });
});
