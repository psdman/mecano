export interface SessionUser {
  id: string;
  username: string;
  role: 'admin' | 'mecanicien';
  nom?: string;
}

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, error: `HTTP ${res.status}` }; }
}

export const api = {
  login: (username: string, password: string) =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  me: () => req('/api/auth/me'),
  listUsers: () => req('/api/users'),
  createUser: (u: { username: string; password: string; role: string; nom?: string }) =>
    req('/api/users', { method: 'POST', body: JSON.stringify(u) }),
  deleteUser: (id: string) => req(`/api/users/${id}`, { method: 'DELETE' }),
  changePassword: (oldPassword: string, newPassword: string) =>
    req('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) }),
  getSettings: () => req('/api/settings'),
  saveSettings: (settings: Record<string, string>) =>
    req('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getCollection: (coll: string) => req(`/api/data/${coll}`),
  replaceCollection: (coll: string, items: any[]) =>
    req(`/api/data/${coll}/replace`, { method: 'PUT', body: JSON.stringify(items) }),
};
