'use client';
import { useEffect, useState } from 'react';
import { API_BASE, storage } from '@/lib/api';

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const storedEmail = await storage.get('email');
    const own = await storage.get('isOwner');

    if (own !== 'true' || !storedEmail) {
      setIsOwner(false);
      return;
    }

    setEmail(storedEmail);
    setIsOwner(true);

    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail: storedEmail }),
    });
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function ban(uid: string, unban = false) {
    setBusy(true);
    setMsg('');
    const res = await fetch(`${API_BASE}/api/admin/${unban ? 'unban' : 'ban'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail: email, userId: uid }),
    }).then((r) => r.json());
    setMsg(res.error || (unban ? 'Unbanned' : 'Banned'));
    await load();
    setBusy(false);
  }

  async function giveSubs(uid: string, count: number) {
    setBusy(true);
    setMsg('');
    const res = await fetch(`${API_BASE}/api/admin/give-subs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail: email, channelId: uid, count }),
    }).then((r) => r.json());
    setMsg(res.error || `Granted ${count} subs`);
    setBusy(false);
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
        <p className="text-gray-500 text-sm mt-2">
          Only the FaceTube owner can use this page.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          If you just logged in, sign out and sign in again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2 text-navy-900">Admin Panel</h1>
        <p className="text-gray-500 mb-8">Full control over FaceTube.</p>

        {msg && (
          <div className="card mb-6 text-sm text-purple-700 font-semibold">
            {msg}
          </div>
        )}

        <div className="space-y-3">
          {users.map((u) => (
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
                      onClick={() => ban(u.id, true)}
                      disabled={busy}
                      className="px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-300"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => ban(u.id)}
                      disabled={busy}
                      className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-300"
                    >
                      Ban
                    </button>
                  )}
                  <button
                    onClick={() => giveSubs(u.id, 1000)}
                    disabled={busy}
                    className="px-4 py-1.5 rounded-full btn-purple text-xs font-bold"
                  >
                    +1000 subs
                  </button>
                  <button
                    onClick={() => giveSubs(u.id, 1)}
                    disabled={busy}
                    className="px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200"
                  >
                    +1 sub
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
