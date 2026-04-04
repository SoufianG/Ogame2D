import { useState, useCallback, useEffect } from 'react';
import { apiPost, setToken, getToken } from '../api/client';

interface AuthUser {
  id: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Verifier le token au chargement
  useEffect(() => {
    const token = getToken();
    if (token) {
      // Decoder le payload JWT (sans verification — le serveur verifie)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Verifier expiration
        if (payload.exp * 1000 > Date.now()) {
          setState({ user: { id: payload.userId, username: payload.username }, loading: false, error: null });
          return;
        }
      } catch {
        // Token invalide
      }
      setToken(null);
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>('/auth/login', { username, password });
      setToken(res.token);
      setState({ user: res.user, loading: false, error: null });
      return true;
    } catch (err) {
      setState({ user: null, loading: false, error: (err as Error).message });
      return false;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiPost<{ token: string; user: AuthUser }>('/auth/register', { username, email, password });
      setToken(res.token);
      setState({ user: res.user, loading: false, error: null });
      return true;
    } catch (err) {
      setState({ user: null, loading: false, error: (err as Error).message });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, register, logout };
}
