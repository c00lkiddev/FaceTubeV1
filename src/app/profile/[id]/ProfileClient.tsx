'use client';
import { useEffect, useState } from 'react';
import { API_BASE, storage } from '@/lib/api';
import OwnerBadge from '@/components/OwnerBadge';
import VerifiedBadge from '@/components/VerifiedBadge';

export default function ProfileClient() {
  const [id, setId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const urlId = parts[1] || 'placeholder';
    setId(urlId);

    fetch(`${API_BASE}/api/user/${urlId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setSubCount(d.subscriberCount || 0);
      })
      .catch(() => setData({ error: true }))
      .finally(() => setLoading(false));

    storage.get('uid').then((uid) => setMyId(uid || ''));

    fetch(`${API_BASE}/api/subs/${urlId}`)
      .then((r) => r.json())
      .then((s) => {
        setSubCount(s.count || 0);
        if (myId) setSubscribed(s.subscribers?.includes(myId) || false);
      })
      .catch(() => {});
  }, []);

  async function toggleSub() {
    if (!myId || myId === id) return;
    const res = await fetch(`${API_BASE}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberId: myId, channelId: id }),
    }).then((r) => r.json());
    setSubscribed(res.subscribed);
    setSubCount((n) => n + (res.subscribed ? 1 : -1));
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-5 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-5 text-center text-red-500">
        User not found
      </div>
    );
  }

  const { user, videos, posts } = data;
  const isMe = myId === id;

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full btn-purple mx-auto grid place-items-center text-4xl font-black text-white mb-4">
            {user.name[0]?.toUpperCase()}
          </div>
          <h1 className="text-3xl font-black flex items-center justify-center text-navy-900">
            {user.name}
            {user.isOwner && <OwnerBadge />}
            {user.verified && !user.isOwner && <VerifiedBadge />}
          </h1>
          <p className="text-gray-500 mt-2">
            <span className="font-bold text-navy-900">{subCount}</span>{' '}
            subscribers
          </p>
          <p className="text-gray-400 mt-1 text-sm">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>

          {!isMe && myId && (
            <button
              onClick={toggleSub}
              className={`mt-5 px-8 py-2.5 rounded-full font-bold text-sm transition ${
                subscribed
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'btn-purple text-white'
              }`}
            >
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          )}
          {isMe && (
            <p className="mt-5 text-xs text-gray-400">
              {subCount} / 1000 to get verified
            </p>
          )}
        </div>

        {videos.length > 0 && (
          <div>
            <h2 className="text-xl font-black mb-4 text-navy-900">Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((v: any) => (
                <a key={v.id} href={`/watch/${v.id}`} className="block group">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-purple-50 border border-purple-100 group-hover:border-purple-300 transition">
                    {v.thumb ? (
                      <img
                        src={v.thumb}
                        alt={v.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-purple-400 text-sm">
                        No thumbnail
                      </div>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold text-navy-900 group-hover:text-purple-600">
                    {v.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {v.views ?? 0} views · {v.comments ?? 0} comments
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div>
            <h2 className="text-xl font-black mb-4 text-navy-900">Posts</h2>
            <div className="space-y-3">
              {posts.map((p: any) => (
                <div key={p.id} className="card">
                  <p className="text-navy-900/80">{p.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length === 0 && posts.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
