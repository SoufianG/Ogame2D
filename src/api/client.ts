const API_BASE = import.meta.env.VITE_API_URL || '/api';

let token: string | null = localStorage.getItem('ogame2d-token');

export function setToken(t: string | null) {
  token = t;
  if (t) {
    localStorage.setItem('ogame2d-token', t);
  } else {
    localStorage.removeItem('ogame2d-token');
  }
}

export function getToken(): string | null {
  return token;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Non authentifie');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }

  return res.json();
}

// Raccourcis
export const apiGet = <T = unknown>(path: string) => api<T>(path);

export const apiPost = <T = unknown>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });

export const apiPut = <T = unknown>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export const apiDelete = <T = unknown>(path: string) =>
  api<T>(path, { method: 'DELETE' });
