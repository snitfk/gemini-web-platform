import { describe, it, expect } from 'vitest';

import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateCode,
} from '../../src/utils/crypto.js';

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'test123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);
      const result = await verifyPassword('wrong', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length', () => {
      const token = generateToken();

      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = generateToken(16);

      expect(token).toBeTruthy();
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateCode', () => {
    it('should generate 6-digit code by default', () => {
      const code = generateCode();

      expect(code).toBeTruthy();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate code with custom length', () => {
      const code = generateCode(4);

      expect(code).toBeTruthy();
      expect(code.length).toBe(4);
      expect(/^\d{4}$/.test(code)).toBe(true);
    });
  });
});
