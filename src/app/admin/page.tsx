'use client';
import { useEffect, useState } from 'react';
import { API_BASE, storage } from '@/lib/api';

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [email, setEmail] = useState('');
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [broadcast, setBroadcast] = useState('');

  async function load() {
    const storedEmail = await storage.get('email');
    const own = await storage.get('isOwner');

    if (own !== 'true' || !storedEmail) {
      setIsOwner(false);
      return;
    }

    setEmail(storedEmail);
    setIsOwner(true);

    const call = (path: string) =>
      fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail: storedEmail }),
      }).then((r) => r.json());

    const [u, s] = await Promise.all([
      call('/api/admin/users'),
      call('/api/admin/stats'),
    ]);

    if (Array.isArray(u)) setUsers(u);
    if (s && !s.error) setStats(s);
  }

  useEffect(() => {
    load();
  }, []);

  function fire(path: string, body: any = {}) {
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail: email, ...body }),
    })
      .then((r) => r.json())
      .then((res) => setMsg(res.error || '✓'))
      .catch(() => setMsg('Failed'));
  }

  function banUser(uid: string, banned: number) {
    setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, banned } : u)));
    fire('/api/admin/ban', { userId: uid });
  }

  function unbanUser(uid: string) {
    setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, banned: 0 } : u)));
    fire('/api/admin/unban', { userId: uid });
  }

  function giveSubs(uid: string, count: number) {
    fire('/api/admin/give-subs', { channelId: uid, count });
  }

  function resetSubs(uid: string) {
    fire('/api/admin/reset-subs', { channelId: uid });
  }

  function deleteUser(uid: string) {
    setUsers((prev) => prev.filter((u) => u.id !== uid));
    fire('/api/admin/delete-user', { userId: uid });
  }

  if (isOwner === null) {
    return (
      <div className="min-h-screen pt-24 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-5 text-center">
        <p className="text-red-500 font-bold">Access denied.</p>
      </div>
    );
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-6 text-navy-900">
          👑 Admin Control Panel
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Users', value: stats.users || users.length },
            { label: 'Videos', value: stats.videos || 0 },
            { label: 'Posts', value: stats.posts || 0 },
            { label: 'Subs', value: stats.subs || 0 },
          ].map((s, i) => (
            <div key={i} className="card text-center">
              <p className="text-3xl font-black gradient-text">{s.value}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="card mb-6">
          <p className="font-bold text-navy-900 mb-3">📢 Broadcast</p>
          <div className="flex gap-2">
            <input
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              placeholder="Type a post to publish as yourself…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && broadcast.trim()) {
                  fire('/api/admin/broadcast', { body: broadcast });
                  setBroadcast('');
                }
              }}
              className="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-2 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => {
                if (!broadcast.trim()) return;
                fire('/api/admin/broadcast', { body: broadcast });
                setBroadcast('');
              }}
              className="px-5 rounded-xl btn-purple font-semibold"
            >
              Post
            </button>
          </div>
        </div>

        {msg && (
          <div className="card mb-6 text-sm text-purple-700 font-semibold">
            {msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-black text-navy-900">
            Users ({filtered.length}/{users.length})
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="bg-white border border-purple-200 rounded-xl px-4 py-2 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold truncate text-navy-900">
                    {u.name}{' '}
                    {u.banned === 1 && (
                      <span className="text-xs text-red-500">(banned)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">ID: {u.id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {u.banned === 1 ? (
                    <button
                      onClick={() => unbanUser(u.id)}
                      className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-300"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => banUser(u.id, 1)}
                      className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-300"
                    >
                      Ban
                    </button>
                  )}
                  <button
                    onClick={() => giveSubs(u.id, 1000)}
                    className="px-3 py-1.5 rounded-full btn-purple text-xs font-bold"
                  >
                    +1000
                  </button>
                  <button
                    onClick={() => giveSubs(u.id, 100)}
                    className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200"
                  >
                    +100
                  </button>
                  <button
                    onClick={() => giveSubs(u.id, 1)}
                    className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => resetSubs(u.id)}
                    className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-300"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => fire('/api/admin/toggle-verify', { userId: u.id })}
                    className="px-3 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold border border-sky-300"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={() => {
                      const newName = prompt('New name for this user:');
                      if (newName) fire('/api/admin/rename-user', { userId: u.id, newName });
                    }}
                    className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-300"
                  >
                    ✎ Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete all this user's comments?"))
                        fire('/api/admin/delete-any-comment', { userId: u.id });
                    }}
                    className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-300"
                  >
                    🗑 Comments
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete all this user's posts?"))
                        fire('/api/admin/delete-any-post', { userId: u.id });
                    }}
                    className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-300"
                  >
                    🗑 Posts
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete all this user's videos?"))
                        fire('/api/admin/delete-any-video', { userId: u.id });
                    }}
                    className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-300"
                  >
                    🗑 Videos
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Permanently delete ${u.name}?`)) deleteUser(u.id);
                    }}
                    className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
