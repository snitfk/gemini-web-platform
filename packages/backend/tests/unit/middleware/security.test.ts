import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock prisma before importing security middleware
vi.mock('../../../src/utils/prisma.js', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock workspace repository to avoid prisma dependency
vi.mock('../../../src/repositories/workspace.repository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    count: vi.fn(),
  },
}));

import {
  sanitizeInput,
  preventPathTraversal,
  validateContentType,
  checkApiVersion,
} from '../../../src/middleware/security.js';
import { BadRequestError } from '../../../src/types/errors.js';

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
      method: 'POST',
      user: { id: 'user-1', email: 'test@test.com', username: 'testuser' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFn = vi.fn();
  });

  describe('sanitizeInput', () => {
    it('should pass through normal input', () => {
      mockReq.body = { name: 'Test', value: 123 };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'Test', value: 123 });
    });

    it('should remove dangerous keys starting with $', () => {
      mockReq.body = { name: 'Test', $where: 'malicious' };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body).not.toHaveProperty('$where');
      expect(mockReq.body).toHaveProperty('name');
    });

    it('should remove keys starting with __', () => {
      mockReq.body = { name: 'Test', __proto__: 'attack' };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body).not.toHaveProperty('__proto__');
    });

    it('should remove null bytes from strings', () => {
      mockReq.body = { name: 'Test\0Value' };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body.name).toBe('TestValue');
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        outer: {
          inner: 'value',
          $evil: 'bad',
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body.outer).toHaveProperty('inner');
      expect(mockReq.body.outer).not.toHaveProperty('$evil');
    });

    it('should handle arrays', () => {
      mockReq.body = {
        items: [
          { name: 'Item 1', $bad: 'evil' },
          { name: 'Item 2' },
        ],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.body.items[0]).not.toHaveProperty('$bad');
      expect(mockReq.body.items[0]).toHaveProperty('name');
    });
  });

  describe('preventPathTraversal', () => {
    it('should pass through valid paths', () => {
      mockReq.body = { path: 'folder/file.txt' };

      const middleware = preventPathTraversal();
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(nextFn).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should block ../ patterns', () => {
      mockReq.body = { path: '../secret/file.txt' };

      const middleware = preventPathTraversal();
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should block paths starting with /', () => {
      mockReq.body = { path: '/etc/passwd' };

      const middleware = preventPathTraversal();
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should block ~/ patterns', () => {
      mockReq.body = { path: '~/.ssh/id_rsa' };

      const middleware = preventPathTraversal();
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should check query parameter if not in body', () => {
      mockReq.body = {};
      mockReq.query = { path: '../attack' };

      const middleware = preventPathTraversal();
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('should use custom path parameter name', () => {
      mockReq.body = { filePath: '../attack' };

      const middleware = preventPathTraversal('filePath');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });

  describe('validateContentType', () => {
    it('should pass for allowed content types', () => {
      mockReq.headers = { 'content-type': 'application/json' };
      mockReq.method = 'POST';

      const middleware = validateContentType(['application/json']);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(nextFn).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject disallowed content types', () => {
      mockReq.headers = { 'content-type': 'text/html' };
      mockReq.method = 'POST';

      const middleware = validateContentType(['application/json']);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, nextFn);
      }).toThrow(BadRequestError);
    });

    it('should skip validation for GET requests', () => {
      mockReq.headers = {};
      mockReq.method = 'GET';

      const middleware = validateContentType(['application/json']);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should require content-type for POST requests', () => {
      mockReq.headers = {};
      mockReq.method = 'POST';

      const middleware = validateContentType(['application/json']);

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, nextFn);
      }).toThrow(BadRequestError);
    });
  });

  describe('checkApiVersion', () => {
    it('should pass when no version header is provided', () => {
      mockReq.headers = {};

      const middleware = checkApiVersion('1.0');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should pass for equal version', () => {
      mockReq.headers = { 'x-api-version': '1.0' };

      const middleware = checkApiVersion('1.0');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should pass for higher version', () => {
      mockReq.headers = { 'x-api-version': '2.0' };

      const middleware = checkApiVersion('1.0');
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should reject lower version', () => {
      mockReq.headers = { 'x-api-version': '0.9' };

      const middleware = checkApiVersion('1.0');

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, nextFn);
      }).toThrow(BadRequestError);
    });
  });
});
