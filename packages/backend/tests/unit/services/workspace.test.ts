import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceService } from '../../../src/services/workspace.service.js';

// Mock the workspace repository
vi.mock('../../../src/repositories/workspace.repository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    count: vi.fn(),
    updateLastUsedAt: vi.fn(),
    updateStorageUsed: vi.fn(),
    findIdleWorkspaces: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { workspaceRepository } from '../../../src/repositories/workspace.repository.js';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;

  const mockWorkspace = {
    id: 'workspace-1',
    userId: 'user-1',
    name: 'Test Workspace',
    description: 'A test workspace',
    status: 'active',
    containerId: null,
    config: {},
    storageUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceService = new WorkspaceService();
  });

  describe('createWorkspace', () => {
    it('should create a new workspace', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(0);
      vi.mocked(workspaceRepository.create).mockResolvedValue(mockWorkspace);

      const result = await workspaceService.createWorkspace('user-1', {
        name: 'Test Workspace',
        description: 'A test workspace',
      });

      expect(result).toEqual(mockWorkspace);
      expect(workspaceRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Test Workspace',
        description: 'A test workspace',
        config: {},
      });
    });

    it('should throw error when max workspaces reached', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(10);

      await expect(
        workspaceService.createWorkspace('user-1', { name: 'Test' })
      ).rejects.toThrow('Maximum number of workspaces reached');
    });

    it('should throw error when name is too long', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(0);

      const longName = 'a'.repeat(101);

      await expect(
        workspaceService.createWorkspace('user-1', { name: longName })
      ).rejects.toThrow('Workspace name must be less than');
    });

    it('should throw error when description is too long', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(0);

      const longDescription = 'a'.repeat(501);

      await expect(
        workspaceService.createWorkspace('user-1', {
          name: 'Test',
          description: longDescription,
        })
      ).rejects.toThrow('Workspace description must be less than');
    });
  });

  describe('getWorkspace', () => {
    it('should return workspace for valid owner', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);

      const result = await workspaceService.getWorkspace('workspace-1', 'user-1');

      expect(result).toEqual(mockWorkspace);
    });

    it('should throw NotFoundError when workspace not found', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(null);

      await expect(
        workspaceService.getWorkspace('workspace-1', 'user-1')
      ).rejects.toThrow('Workspace not found');
    });

    it('should throw ForbiddenError when user is not owner', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);

      await expect(
        workspaceService.getWorkspace('workspace-1', 'user-2')
      ).rejects.toThrow('Access denied to this workspace');
    });

    it('should throw NotFoundError when workspace is deleted', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        ...mockWorkspace,
        status: 'deleted',
      });

      await expect(
        workspaceService.getWorkspace('workspace-1', 'user-1')
      ).rejects.toThrow('Workspace has been deleted');
    });
  });

  describe('listUserWorkspaces', () => {
    it('should return user workspaces', async () => {
      const workspaces = [mockWorkspace];
      vi.mocked(workspaceRepository.findByUserId).mockResolvedValue(workspaces);

      const result = await workspaceService.listUserWorkspaces('user-1');

      expect(result).toEqual(workspaces);
      expect(workspaceRepository.findByUserId).toHaveBeenCalledWith('user-1', 'active');
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);
      vi.mocked(workspaceRepository.update).mockResolvedValue({
        ...mockWorkspace,
        name: 'Updated Name',
      });

      const result = await workspaceService.updateWorkspace(
        'workspace-1',
        'user-1',
        { name: 'Updated Name' }
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error when name is too long', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);

      const longName = 'a'.repeat(101);

      await expect(
        workspaceService.updateWorkspace('workspace-1', 'user-1', { name: longName })
      ).rejects.toThrow('Workspace name must be less than');
    });
  });

  describe('deleteWorkspace', () => {
    it('should soft delete workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);
      vi.mocked(workspaceRepository.softDelete).mockResolvedValue(undefined);

      await workspaceService.deleteWorkspace('workspace-1', 'user-1');

      expect(workspaceRepository.softDelete).toHaveBeenCalledWith('workspace-1');
    });
  });

  describe('archiveWorkspace', () => {
    it('should archive workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);
      vi.mocked(workspaceRepository.archive).mockResolvedValue({
        ...mockWorkspace,
        status: 'archived',
      });

      const result = await workspaceService.archiveWorkspace('workspace-1', 'user-1');

      expect(result.status).toBe('archived');
    });
  });

  describe('restoreWorkspace', () => {
    it('should restore archived workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        ...mockWorkspace,
        status: 'archived',
      });
      vi.mocked(workspaceRepository.count).mockResolvedValue(0);
      vi.mocked(workspaceRepository.restore).mockResolvedValue({
        ...mockWorkspace,
        status: 'active',
      });

      const result = await workspaceService.restoreWorkspace('workspace-1', 'user-1');

      expect(result.status).toBe('active');
    });

    it('should throw error when workspace is not archived', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(mockWorkspace);

      await expect(
        workspaceService.restoreWorkspace('workspace-1', 'user-1')
      ).rejects.toThrow('Workspace is not archived');
    });

    it('should throw error when max workspaces reached', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        ...mockWorkspace,
        status: 'archived',
      });
      vi.mocked(workspaceRepository.count).mockResolvedValue(10);

      await expect(
        workspaceService.restoreWorkspace('workspace-1', 'user-1')
      ).rejects.toThrow('Cannot restore: maximum number of active workspaces reached');
    });
  });

  describe('checkStorageQuota', () => {
    it('should return true when within quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        ...mockWorkspace,
        storageUsed: 100,
      });

      const result = await workspaceService.checkStorageQuota('workspace-1', 1000);

      expect(result).toBe(true);
    });

    it('should return false when exceeds quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        ...mockWorkspace,
        storageUsed: 1024 * 1024 * 1024 - 100, // Near 1GB limit
      });

      const result = await workspaceService.checkStorageQuota('workspace-1', 1000);

      expect(result).toBe(false);
    });
  });

  describe('cleanupIdleWorkspaces', () => {
    it('should clean up idle workspaces with containers', async () => {
      vi.mocked(workspaceRepository.findIdleWorkspaces).mockResolvedValue([
        { ...mockWorkspace, containerId: 'container-1' },
        { ...mockWorkspace, id: 'workspace-2', containerId: 'container-2' },
      ]);

      const result = await workspaceService.cleanupIdleWorkspaces();

      expect(result).toBe(2);
    });

    it('should skip workspaces without containers', async () => {
      vi.mocked(workspaceRepository.findIdleWorkspaces).mockResolvedValue([
        mockWorkspace, // No containerId
      ]);

      const result = await workspaceService.cleanupIdleWorkspaces();

      expect(result).toBe(0);
    });
  });
});
