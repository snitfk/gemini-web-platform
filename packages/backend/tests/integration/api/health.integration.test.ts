import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/app.js';
import type { Express } from 'express';

// Mock Prisma to avoid database dependency in tests
vi.mock('../../../src/utils/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    file: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

describe('Health API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });
  });

  describe('GET /api', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/api');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Gemini Web Platform API');
      expect(response.body.data.version).toBeDefined();
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
