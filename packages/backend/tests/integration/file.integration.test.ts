import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileService } from '../../src/services/file.service.js';

// Mock prisma
vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    file: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock workspace repository
vi.mock('../../src/repositories/workspace.repository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    updateStorageUsed: vi.fn(),
  },
}));

// Mock file system adapter
vi.mock('../../src/adapters/factory.js', () => ({
  AdapterFactory: {
    getFileSystemAdapter: vi.fn().mockReturnValue({
      readFile: vi.fn(),
      writeFile: vi.fn(),
      editFile: vi.fn(),
      deleteFile: vi.fn(),
      listFiles: vi.fn(),
      fileExists: vi.fn(),
      createDirectory: vi.fn(),
    }),
  },
}));

import { workspaceRepository } from '../../src/repositories/workspace.repository.js';
import { prisma } from '../../src/utils/prisma.js';
import { AdapterFactory } from '../../src/adapters/factory.js';

describe('File Service Integration', () => {
  let fileService: FileService;
  let mockFsAdapter: ReturnType<typeof AdapterFactory.getFileSystemAdapter>;
  const mockUserId = 'test-user-123';
  const mockWorkspaceId = 'test-workspace-456';

  beforeEach(() => {
    vi.clearAllMocks();

    mockFsAdapter = AdapterFactory.getFileSystemAdapter();

    // Setup workspace mock
    vi.mocked(workspaceRepository.findById).mockResolvedValue({
      id: mockWorkspaceId,
      userId: mockUserId,
      name: 'Test Workspace',
      description: null,
      status: 'active',
      containerId: null,
      storageUsed: 0,
      config: {},
      settings: {},
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(workspaceRepository.updateStorageUsed).mockResolvedValue({
      id: mockWorkspaceId,
      userId: mockUserId,
      name: 'Test Workspace',
      description: null,
      status: 'active',
      containerId: null,
      storageUsed: 1000,
      config: {},
      settings: {},
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.file.create).mockResolvedValue({
      id: 'file-123',
      workspaceId: mockWorkspaceId,
      name: 'test.txt',
      path: 'test.txt',
      mimeType: 'text/plain',
      size: 100,
      storageKey: `${mockWorkspaceId}/test.txt`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.file.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.file.count).mockResolvedValue(5);

    fileService = new FileService();
  });

  describe('File Operations', () => {
    it('should read a file', async () => {
      const fileContent = 'Hello, World!';
      vi.mocked(mockFsAdapter.readFile).mockResolvedValue(fileContent);
      vi.mocked(mockFsAdapter.listFiles).mockResolvedValue([
        {
          name: 'test.txt',
          path: 'test.txt',
          size: fileContent.length,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
      ]);

      const result = await fileService.readFile(mockWorkspaceId, mockUserId, 'test.txt');

      expect(result.content).toBe(fileContent);
      expect(result.metadata.name).toBe('test.txt');
    });

    it('should write a file', async () => {
      vi.mocked(mockFsAdapter.writeFile).mockResolvedValue();

      const result = await fileService.writeFile(
        mockWorkspaceId,
        mockUserId,
        'new-file.txt',
        'New content'
      );

      expect(result.name).toBe('test.txt'); // From mocked prisma.file.create
      expect(mockFsAdapter.writeFile).toHaveBeenCalledWith(
        mockWorkspaceId,
        'new-file.txt',
        'New content'
      );
      expect(workspaceRepository.updateStorageUsed).toHaveBeenCalled();
    });

    it('should edit a file', async () => {
      vi.mocked(mockFsAdapter.editFile).mockResolvedValue();

      await fileService.editFile(mockWorkspaceId, mockUserId, 'test.txt', [
        { oldText: 'old', newText: 'new' },
      ]);

      expect(mockFsAdapter.editFile).toHaveBeenCalledWith(mockWorkspaceId, 'test.txt', [
        { oldText: 'old', newText: 'new' },
      ]);
    });

    it('should delete a file', async () => {
      vi.mocked(mockFsAdapter.listFiles).mockResolvedValue([
        {
          name: 'test.txt',
          path: 'test.txt',
          size: 100,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
      ]);
      vi.mocked(mockFsAdapter.deleteFile).mockResolvedValue();

      await fileService.deleteFile(mockWorkspaceId, mockUserId, 'test.txt');

      expect(mockFsAdapter.deleteFile).toHaveBeenCalledWith(mockWorkspaceId, 'test.txt');
      expect(prisma.file.deleteMany).toHaveBeenCalled();
    });

    it('should list files', async () => {
      vi.mocked(mockFsAdapter.listFiles).mockResolvedValue([
        {
          name: 'file1.txt',
          path: 'file1.txt',
          size: 100,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
        {
          name: 'file2.txt',
          path: 'file2.txt',
          size: 200,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
      ]);

      const files = await fileService.listFiles(mockWorkspaceId, mockUserId);

      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('file1.txt');
    });

    it('should check if file exists', async () => {
      vi.mocked(mockFsAdapter.fileExists).mockResolvedValue(true);

      const exists = await fileService.fileExists(mockWorkspaceId, mockUserId, 'test.txt');

      expect(exists).toBe(true);
    });

    it('should create directory', async () => {
      vi.mocked(mockFsAdapter.createDirectory).mockResolvedValue();

      await fileService.createDirectory(mockWorkspaceId, mockUserId, 'new-folder');

      expect(mockFsAdapter.createDirectory).toHaveBeenCalledWith(
        mockWorkspaceId,
        'new-folder'
      );
    });
  });

  describe('Storage Stats', () => {
    it('should get storage statistics', async () => {
      const stats = await fileService.getStorageStats(mockWorkspaceId, mockUserId);

      expect(stats.used).toBe(0); // From mock workspace storageUsed
      expect(stats.quota).toBe(1024 * 1024 * 1024); // 1GB
      expect(stats.files).toBe(5); // From mock prisma.file.count
    });
  });

  describe('Path Validation', () => {
    it('should reject paths with traversal patterns', async () => {
      await expect(
        fileService.readFile(mockWorkspaceId, mockUserId, '../secret/file.txt')
      ).rejects.toThrow('forbidden pattern');
    });

    it('should reject paths with home directory', async () => {
      await expect(
        fileService.readFile(mockWorkspaceId, mockUserId, '~/sensitive/data')
      ).rejects.toThrow('forbidden pattern');
    });

    it('should reject forbidden file extensions', async () => {
      await expect(
        fileService.writeFile(mockWorkspaceId, mockUserId, 'script.exe', 'malicious')
      ).rejects.toThrow('extension not allowed');
    });

    it('should reject paths that are too long', async () => {
      const longPath = 'a'.repeat(501);
      await expect(
        fileService.readFile(mockWorkspaceId, mockUserId, longPath)
      ).rejects.toThrow('too long');
    });
  });

  describe('Storage Quota', () => {
    it('should reject files that exceed max size', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB

      await expect(
        fileService.writeFile(mockWorkspaceId, mockUserId, 'large.txt', largeContent)
      ).rejects.toThrow('too large');
    });

    it('should reject when storage quota is exceeded', async () => {
      // Set workspace near quota
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: null,
        storageUsed: 1023 * 1024 * 1024, // Almost 1GB
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const content = 'x'.repeat(2 * 1024 * 1024); // 2MB would exceed quota

      await expect(
        fileService.writeFile(mockWorkspaceId, mockUserId, 'test.txt', content)
      ).rejects.toThrow('quota exceeded');
    });
  });

  describe('Authorization', () => {
    it('should reject access from non-owner', async () => {
      const differentUserId = 'different-user-789';

      await expect(
        fileService.readFile(mockWorkspaceId, differentUserId, 'test.txt')
      ).rejects.toThrow('Access denied');
    });

    it('should reject access to deleted workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'deleted',
        containerId: null,
        storageUsed: 0,
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        fileService.readFile(mockWorkspaceId, mockUserId, 'test.txt')
      ).rejects.toThrow('deleted');
    });

    it('should reject when workspace not found', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(null);

      await expect(
        fileService.readFile(mockWorkspaceId, mockUserId, 'test.txt')
      ).rejects.toThrow('not found');
    });
  });
});
