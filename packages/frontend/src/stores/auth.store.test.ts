import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './auth.store';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set auth correctly', () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
    };
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';

    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    const state = useAuthStore.getState();

    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe(accessToken);
    expect(state.refreshToken).toBe(refreshToken);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should store tokens in localStorage when setting auth', () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
    };

    useAuthStore.getState().setAuth(user, 'access-token', 'refresh-token');

    expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
  });

  it('should clear auth correctly', () => {
    // Set auth first
    useAuthStore.getState().setAuth(
      { id: '1', email: 'test@example.com', username: 'testuser' },
      'access-token',
      'refresh-token'
    );

    // Clear auth
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should remove tokens from localStorage when clearing auth', () => {
    useAuthStore.getState().clearAuth();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should update user correctly', () => {
    const initialUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
    };
    useAuthStore.getState().setAuth(initialUser, 'token', 'refresh');

    const updatedUser = {
      ...initialUser,
      username: 'newusername',
    };
    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('newusername');
  });

  it('should set loading state correctly', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
