import { apiRequest } from '@/lib/api-client';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  lastModified: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export interface StorageStats {
  used: number;
  quota: number;
  files: number;
}

export const fileService = {
  async readFile(workspaceId: string, path: string): Promise<{ content: string; metadata: FileInfo }> {
    return apiRequest({
      method: 'GET',
      url: `/workspaces/${workspaceId}/files`,
      params: { path },
    });
  },

  async writeFile(
    workspaceId: string,
    path: string,
    content: string,
    mimeType?: string
  ): Promise<FileInfo> {
    return apiRequest({
      method: 'POST',
      url: `/workspaces/${workspaceId}/files`,
      data: { path, content, mimeType },
    });
  },

  async editFile(
    workspaceId: string,
    path: string,
    edits: Array<{ oldText: string; newText: string }>
  ): Promise<void> {
    return apiRequest({
      method: 'PATCH',
      url: `/workspaces/${workspaceId}/files`,
      data: { path, edits },
    });
  },

  async deleteFile(workspaceId: string, path: string): Promise<void> {
    return apiRequest({
      method: 'DELETE',
      url: `/workspaces/${workspaceId}/files`,
      params: { path },
    });
  },

  async listFiles(workspaceId: string, pattern?: string): Promise<{ files: FileInfo[] }> {
    return apiRequest({
      method: 'GET',
      url: `/workspaces/${workspaceId}/files/list`,
      params: { pattern },
    });
  },

  async createDirectory(workspaceId: string, path: string): Promise<void> {
    return apiRequest({
      method: 'POST',
      url: `/workspaces/${workspaceId}/files/directory`,
      data: { path },
    });
  },

  async getStorageStats(workspaceId: string): Promise<StorageStats> {
    return apiRequest({
      method: 'GET',
      url: `/workspaces/${workspaceId}/files/stats`,
    });
  },
};
