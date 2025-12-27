import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdapterFactory } from '../../../src/adapters/factory.js';

describe('AdapterFactory', () => {
  afterEach(() => {
    // Reset the factory after each test
    AdapterFactory.reset();
  });

  describe('getFileSystemAdapter', () => {
    it('should return filesystem adapter', () => {
      const adapter = AdapterFactory.getFileSystemAdapter();

      expect(adapter).toBeDefined();
      expect(typeof adapter.readFile).toBe('function');
      expect(typeof adapter.writeFile).toBe('function');
      expect(typeof adapter.editFile).toBe('function');
      expect(typeof adapter.listFiles).toBe('function');
      expect(typeof adapter.deleteFile).toBe('function');
      expect(typeof adapter.fileExists).toBe('function');
      expect(typeof adapter.createDirectory).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const adapter1 = AdapterFactory.getFileSystemAdapter();
      const adapter2 = AdapterFactory.getFileSystemAdapter();

      expect(adapter1).toBe(adapter2);
    });
  });

  describe('getShellAdapter', () => {
    it('should return shell adapter', () => {
      const adapter = AdapterFactory.getShellAdapter();

      expect(adapter).toBeDefined();
      expect(typeof adapter.execute).toBe('function');
      expect(typeof adapter.kill).toBe('function');
      expect(typeof adapter.getRunningProcesses).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const adapter1 = AdapterFactory.getShellAdapter();
      const adapter2 = AdapterFactory.getShellAdapter();

      expect(adapter1).toBe(adapter2);
    });
  });

  describe('getWebToolsAdapter', () => {
    it('should return web tools adapter', () => {
      const adapter = AdapterFactory.getWebToolsAdapter();

      expect(adapter).toBeDefined();
      expect(typeof adapter.fetch).toBe('function');
      expect(typeof adapter.search).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const adapter1 = AdapterFactory.getWebToolsAdapter();
      const adapter2 = AdapterFactory.getWebToolsAdapter();

      expect(adapter1).toBe(adapter2);
    });
  });

  describe('reset', () => {
    it('should create new instances after reset', () => {
      const adapter1 = AdapterFactory.getFileSystemAdapter();
      AdapterFactory.reset();
      const adapter2 = AdapterFactory.getFileSystemAdapter();

      // After reset, should get a new instance
      expect(adapter1).not.toBe(adapter2);
    });
  });
});
