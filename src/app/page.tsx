'use client';
import { useEffect, useState } from 'react';
import { api, storage } from '@/lib/api';
import OwnerBadge from '@/components/OwnerBadge';

export default function Home() {
  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [v, p] = await Promise.all([api.videos.list(), api.posts.list()]);
      setVideos(v);
      setPosts(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    storage.get('uname').then((n) => setName(n || ''));
    storage.get('uid').then((id) => setUid(id || ''));
  }, []);

  async function submitPost() {
    if (!body.trim() || !uid || busy) return;
    setBusy(true);
    try {
      await api.posts.create({ body, authorId: uid });
      setBody('');
      load();
    } finally {
      setBusy(false);
    }
  }

  const initial =
    name && name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-2xl mx-auto space-y-5">
        {!uid && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-3xl btn-purple mx-auto grid place-items-center text-5xl font-black mb-8">
              F
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4 text-navy-900">
              Face<span className="gradient-text">Tube</span>
            </h1>
            <p className="text-gray-500 mb-8 text-lg">Watch. Share. Connect.</p>
            <button
              onClick={() => (window.location.href = '/login/')}
              className="inline-block px-8 py-3.5 rounded-full btn-purple font-bold"
            >
              Get started
            </button>
          </div>
        )}

        {uid && (
          <div className="card">
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-full btn-purple shrink-0 grid place-items-center font-bold">
                {initial}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's on your mind?"
                rows={2}
                className="flex-1 bg-transparent resize-none text-navy-900 placeholder-gray-400 focus:outline-none pt-3"
              />
            </div>
            {body && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={submitPost}
                  disabled={busy}
                  className="px-5 py-2 rounded-full btn-purple text-sm font-bold disabled:opacity-50"
                >
                  {busy ? 'Posting…' : 'Post'}
                </button>
              </div>
            )}
          </div>
        )}

        {posts.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <a
                href={`/profile?id=${p.authorId}`}
                className="w-10 h-10 rounded-full btn-purple grid place-items-center font-bold text-sm"
              >
                {p.authorName?.[0]?.toUpperCase() || '?'}
              </a>
              <a
                href={`/profile?id=${p.authorId}`}
                className="font-bold flex items-center text-navy-900 hover:text-purple-600 transition"
              >
                {p.authorName}
                {p.isOwner && <OwnerBadge />}
              </a>
            </div>
            <p className="text-navy-900/80">{p.body}</p>
          </div>
        ))}

        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {videos.map((v) => (
              <a key={v.id} href={`/watch?id=${v.id}`} className="block group">
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
                <h3 className="mt-2 font-bold text-navy-900 group-hover:text-purple-600 transition">
                  {v.title}
                </h3>
                <p className="text-sm text-gray-500 flex items-center">
                  {v.authorName}
                  {v.isOwner && <OwnerBadge />}
                </p>
                <p className="text-xs text-gray-400">
                  {v.views ?? 0} views · {v.comments ?? 0} comments
                </p>
              </a>
            ))}
          </div>
        )}

        {loading && !uid && (
          <p className="text-center text-gray-500 py-8">Loading…</p>
        )}

        {!loading && posts.length === 0 && videos.length === 0 && uid && (
          <p className="text-center text-gray-500 py-10">
            Nothing here yet. Post something to get started.
          </p>
        )}
      </div>
    </div>
  );
}
