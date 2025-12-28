import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PermissionService,
  ResourceType,
  ActionType,
} from '../../../src/services/permission.service.js';
import { ForbiddenError, NotFoundError } from '../../../src/types/errors.js';

// Mock workspace repository
vi.mock('../../../src/repositories/workspace.repository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    count: vi.fn(),
  },
}));

import { workspaceRepository } from '../../../src/repositories/workspace.repository.js';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
    vi.clearAllMocks();
  });

  describe('checkPermission', () => {
    describe('workspace permissions', () => {
      it('should allow owner to read workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
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

        const result = await service.checkPermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(true);
      });

      it('should deny non-owner access', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
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

        const result = await service.checkPermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-2', // Different user
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('do not own');
      });

      it('should throw NotFoundError for non-existent workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue(null);

        await expect(
          service.checkPermission({
            resourceType: ResourceType.WORKSPACE,
            resourceId: 'ws-999',
            action: ActionType.READ,
            userId: 'user-1',
          })
        ).rejects.toThrow(NotFoundError);
      });

      it('should deny access to deleted workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
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

        const result = await service.checkPermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('deleted');
      });

      it('should restrict write access to archived workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
          name: 'Test Workspace',
          description: null,
          status: 'archived',
          containerId: null,
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await service.checkPermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.WRITE,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('archived');
      });

      it('should allow read access to archived workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
          name: 'Test Workspace',
          description: null,
          status: 'archived',
          containerId: null,
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await service.checkPermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(true);
      });
    });

    describe('container permissions', () => {
      it('should allow owner to execute in container', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
          name: 'Test Workspace',
          description: null,
          status: 'active',
          containerId: 'container-1',
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await service.checkPermission({
          resourceType: ResourceType.CONTAINER,
          resourceId: 'ws-1',
          action: ActionType.EXECUTE,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(true);
      });

      it('should deny execute on non-active workspace', async () => {
        vi.mocked(workspaceRepository.findById).mockResolvedValue({
          id: 'ws-1',
          userId: 'user-1',
          name: 'Test Workspace',
          description: null,
          status: 'archived',
          containerId: 'container-1',
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await service.checkPermission({
          resourceType: ResourceType.CONTAINER,
          resourceId: 'ws-1',
          action: ActionType.EXECUTE,
          userId: 'user-1',
        });

        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('enforcePermission', () => {
    it('should not throw when permission is granted', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: 'ws-1',
        userId: 'user-1',
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

      await expect(
        service.enforcePermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-1',
        })
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError when permission is denied', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: 'ws-1',
        userId: 'user-1',
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

      await expect(
        service.enforcePermission({
          resourceType: ResourceType.WORKSPACE,
          resourceId: 'ws-1',
          action: ActionType.READ,
          userId: 'user-2', // Different user
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('canCreateWorkspace', () => {
    it('should allow creation when under limit', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(5);

      const result = await service.canCreateWorkspace('user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny creation when at limit', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(10);

      const result = await service.canCreateWorkspace('user-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum');
    });
  });

  describe('checkStorageQuota', () => {
    it('should allow when under quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: 'ws-1',
        userId: 'user-1',
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: null,
        storageUsed: 100 * 1024 * 1024, // 100MB
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.checkStorageQuota('ws-1', 50 * 1024 * 1024); // 50MB additional

      expect(result.allowed).toBe(true);
    });

    it('should deny when over quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: 'ws-1',
        userId: 'user-1',
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: null,
        storageUsed: 900 * 1024 * 1024, // 900MB
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.checkStorageQuota('ws-1', 200 * 1024 * 1024); // 200MB additional

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quota exceeded');
    });
  });

  describe('getUserWorkspaceIds', () => {
    it('should return workspace IDs for user', async () => {
      vi.mocked(workspaceRepository.findByUserId).mockResolvedValue([
        {
          id: 'ws-1',
          userId: 'user-1',
          name: 'Workspace 1',
          description: null,
          status: 'active',
          containerId: null,
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ws-2',
          userId: 'user-1',
          name: 'Workspace 2',
          description: null,
          status: 'active',
          containerId: null,
          storageUsed: 0,
          config: {},
          settings: {},
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const ids = await service.getUserWorkspaceIds('user-1');

      expect(ids).toEqual(['ws-1', 'ws-2']);
    });
  });
});
