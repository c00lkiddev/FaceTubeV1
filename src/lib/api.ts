export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const storage = {
  async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

export const api = {
  videos: {
    list: () => request('/api/videos'),
    create: (data: any) =>
      request('/api/videos', { method: 'POST', body: JSON.stringify(data) }),
  },
  posts: {
    list: () => request('/api/posts'),
    create: (data: any) =>
      request('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  },
  likes: {
    toggle: (data: { userId: string; videoId: string }) =>
      request('/api/likes', { method: 'POST', body: JSON.stringify(data) }),
  },
  comments: {
    create: (data: any) =>
      request('/api/comments', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    login: (data: any) =>
      request('/api/auth', { method: 'POST', body: JSON.stringify(data) }),
  },
};
