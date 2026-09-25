const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('support_token');
}

export function setSession(session) {
  localStorage.setItem('support_token', session.token);
  localStorage.setItem('support_user', JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem('support_token');
  localStorage.removeItem('support_user');
}

export function getStoredUser() {
  const raw = localStorage.getItem('support_user');
  return raw ? JSON.parse(raw) : null;
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

