import { apiRequest } from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });
  },

  async signup(data: SignupRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/register',
      data,
    });
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    return apiRequest({
      method: 'POST',
      url: '/auth/logout',
      data: { refreshToken },
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>({
      method: 'GET',
      url: '/users/me',
    });
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return apiRequest({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken },
    });
  },
};
