import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { logout } from '@/features/auth/api';

import { useAuth } from './useAuth';

export function useSignOut() {
  const { clear } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await logout();
    } catch {
      // Sign out locally even if the server is unreachable.
    }
    clear();
    navigate('/login', { replace: true });
  }, [clear, navigate]);
}
