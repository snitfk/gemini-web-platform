import { apiRequest } from '@/lib/api-client';

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'deleted';
  containerId: string | null;
  storageUsed: number;
  config: Record<string, unknown>;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
}

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const response = await apiRequest<{ workspaces: Workspace[] }>({
      method: 'GET',
      url: '/workspaces',
    });
    return response.workspaces;
  },

  async get(workspaceId: string): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'GET',
      url: `/workspaces/${workspaceId}`,
    });
    return response.workspace;
  },

  async create(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'POST',
      url: '/workspaces',
      data,
    });
    return response.workspace;
  },

  async update(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'PATCH',
      url: `/workspaces/${workspaceId}`,
      data,
    });
    return response.workspace;
  },

  async delete(workspaceId: string): Promise<void> {
    return apiRequest({
      method: 'DELETE',
      url: `/workspaces/${workspaceId}`,
    });
  },

  async start(workspaceId: string): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/start`,
    });
    return response.workspace;
  },

  async stop(workspaceId: string): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/stop`,
    });
    return response.workspace;
  },

  async archive(workspaceId: string): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/archive`,
    });
    return response.workspace;
  },

  async restore(workspaceId: string): Promise<Workspace> {
    const response = await apiRequest<{ workspace: Workspace }>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/restore`,
    });
    return response.workspace;
  },
};
