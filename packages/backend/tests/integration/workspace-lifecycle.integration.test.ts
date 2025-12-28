import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PermissionService,
  ResourceType,
  ActionType,
} from '../../src/services/permission.service.js';

// Mock workspace repository
vi.mock('../../src/repositories/workspace.repository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
  },
}));

import { workspaceRepository } from '../../src/repositories/workspace.repository.js';

describe('Workspace Lifecycle Integration', () => {
  let permissionService: PermissionService;
  const mockUserId = 'test-user-123';
  const mockWorkspaceId = 'test-workspace-456';

  beforeEach(() => {
    permissionService = new PermissionService();
    vi.clearAllMocks();
  });

  describe('Workspace States', () => {
    it('should allow all actions on active workspace', async () => {
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

      const readResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.READ,
        userId: mockUserId,
      });

      const writeResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.WRITE,
        userId: mockUserId,
      });

      const deleteResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.DELETE,
        userId: mockUserId,
      });

      expect(readResult.allowed).toBe(true);
      expect(writeResult.allowed).toBe(true);
      expect(deleteResult.allowed).toBe(true);
    });

    it('should allow only read and admin on archived workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
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

      const readResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.READ,
        userId: mockUserId,
      });

      const writeResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.WRITE,
        userId: mockUserId,
      });

      const adminResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.ADMIN,
        userId: mockUserId,
      });

      expect(readResult.allowed).toBe(true);
      expect(writeResult.allowed).toBe(false);
      expect(writeResult.reason).toContain('archived');
      expect(adminResult.allowed).toBe(true); // Admin can restore
    });

    it('should deny all actions on deleted workspace', async () => {
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

      const readResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.READ,
        userId: mockUserId,
      });

      const writeResult = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.WRITE,
        userId: mockUserId,
      });

      expect(readResult.allowed).toBe(false);
      expect(readResult.reason).toContain('deleted');
      expect(writeResult.allowed).toBe(false);
    });
  });

  describe('Container Permissions', () => {
    it('should allow execute only on active workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: 'container-123',
        storageUsed: 0,
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.CONTAINER,
        resourceId: mockWorkspaceId,
        action: ActionType.EXECUTE,
        userId: mockUserId,
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny execute on archived workspace', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'archived',
        containerId: 'container-123',
        storageUsed: 0,
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.CONTAINER,
        resourceId: mockWorkspaceId,
        action: ActionType.EXECUTE,
        userId: mockUserId,
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Workspace Limits', () => {
    it('should allow creation when under limit', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(5);

      const result = await permissionService.canCreateWorkspace(mockUserId);

      expect(result.allowed).toBe(true);
    });

    it('should deny creation when at limit', async () => {
      vi.mocked(workspaceRepository.count).mockResolvedValue(10);

      const result = await permissionService.canCreateWorkspace(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum');
    });
  });

  describe('Storage Quota', () => {
    it('should allow when under quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: null,
        storageUsed: 100 * 1024 * 1024, // 100MB used
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.checkStorageQuota(
        mockWorkspaceId,
        50 * 1024 * 1024 // Adding 50MB
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny when would exceed quota', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        id: mockWorkspaceId,
        userId: mockUserId,
        name: 'Test Workspace',
        description: null,
        status: 'active',
        containerId: null,
        storageUsed: 900 * 1024 * 1024, // 900MB used
        config: {},
        settings: {},
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await permissionService.checkStorageQuota(
        mockWorkspaceId,
        200 * 1024 * 1024 // Adding 200MB would exceed 1GB
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quota exceeded');
    });
  });

  describe('Owner Verification', () => {
    it('should allow owner access', async () => {
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

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.READ,
        userId: mockUserId,
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner access', async () => {
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

      const differentUserId = 'different-user-789';

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.WORKSPACE,
        resourceId: mockWorkspaceId,
        action: ActionType.READ,
        userId: differentUserId,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not own');
    });
  });

  describe('File Permissions', () => {
    it('should inherit workspace permissions for files', async () => {
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

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.FILE,
        resourceId: mockWorkspaceId,
        action: ActionType.WRITE,
        userId: mockUserId,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Chat Session Permissions', () => {
    it('should inherit workspace permissions for chat sessions', async () => {
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

      const result = await permissionService.checkPermission({
        resourceType: ResourceType.CHAT_SESSION,
        resourceId: mockWorkspaceId,
        action: ActionType.WRITE,
        userId: mockUserId,
      });

      expect(result.allowed).toBe(true);
    });
  });
});
