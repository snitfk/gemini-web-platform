import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { env } from './env';

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ error?: { message?: string } }>) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && error.config) {
        try {
          const { data } = await axios.post(`${env.VITE_API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.data.accessToken);

          // Retry original request
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return axios(originalRequest);
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    // Extract error message
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export async function apiRequest<T = unknown>(
  config: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<unknown, ApiResponse<T>>(config);
  if (response.success === false) {
    throw new Error(response.error?.message || 'API request failed');
  }
  // 直接返回 data 字段，如果 data 是 undefined 则返回整个 response（用于非标准响应）
  return (response.data ?? response) as T;
}
