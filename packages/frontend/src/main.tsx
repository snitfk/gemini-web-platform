import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize auth state from localStorage
import { useAuthStore } from '@/stores/auth.store';

const initializeAuth = () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    // Token exists, keep authenticated state
    useAuthStore.getState().setLoading(false);
  } else {
    // No token, clear auth state
    useAuthStore.getState().clearAuth();
  }
};

initializeAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
