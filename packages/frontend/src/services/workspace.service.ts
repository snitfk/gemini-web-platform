import { apiRequest } from '@/lib/api-client';

// 统一使用后端返回格式: { success: true, data: T }
export interface Workspace {
  id: string;
  userId?: string;
  name: string;
  description: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    chatSessions: number;
    files: number;
  };
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
    return apiRequest<Workspace[]>({
      method: 'GET',
      url: '/workspaces',
    });
  },

  async get(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'GET',
      url: `/workspaces/${workspaceId}`,
    });
  },

  async create(data: CreateWorkspaceRequest): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'POST',
      url: '/workspaces',
      data,
    });
  },

  async update(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'PATCH',
      url: `/workspaces/${workspaceId}`,
      data,
    });
  },

  async delete(workspaceId: string): Promise<void> {
    return apiRequest({
      method: 'DELETE',
      url: `/workspaces/${workspaceId}`,
    });
  },

  async start(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/start`,
    });
  },

  async stop(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/stop`,
    });
  },

  async archive(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/archive`,
    });
  },

  async restore(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>({
      method: 'POST',
      url: `/workspaces/${workspaceId}/restore`,
    });
  },
};
