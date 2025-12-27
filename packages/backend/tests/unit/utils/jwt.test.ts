import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateTokenPair,
} from '../../../src/utils/jwt.js';

describe('JWT Utils', () => {
  const userId = 'test-user-id';
  const email = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(userId, email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(userId, email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(userId, email);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('access');
    });

    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(userId, email);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = generateTokenPair(userId, email);

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });
});
