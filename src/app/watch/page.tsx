'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE, storage } from '@/lib/api';
import OwnerBadge from '@/components/OwnerBadge';
import VideoPlayer from '@/components/VideoPlayer';

function WatchInner() {
  const params = useSearchParams();
  const id = params.get('id') || '';
  const [video, setVideo] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(vid: string) {
    const res = await fetch(`${API_BASE}/api/video/${vid}`);
    setVideo(await res.json());
    setLoading(false);
  }

  useEffect(() => { if (id) load(id); else setLoading(false); }, [id]);

  async function addComment() {
    const userId = await storage.get('uid');
    if (!userId || !comment.trim() || busy) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment, userId, videoId: id }),
      });
      setComment('');
      load(id);
    } finally { setBusy(false); }
  }

  if (loading) return <div className="min-h-screen pt-24 text-center text-gray-500">Loading…</div>;
  if (!video || video.error) return <div className="min-h-screen pt-24 text-center text-red-500">Video not found</div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-5">
      <div className="max-w-3xl mx-auto">
        <VideoPlayer src={video.url} />
        <h1 className="text-2xl font-bold mt-5 text-navy-900">{video.title}</h1>
        <p className="text-gray-500 flex items-center mt-1">
          {video.authorName}{video.isOwner && <OwnerBadge />}<span className="mx-2">·</span>{video.views} views
        </p>
        <hr className="my-6 border-purple-100" />
        <h2 className="font-semibold mb-3 text-navy-900">{video.comments?.length ?? 0} comments</h2>
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
            placeholder="Add a comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addComment()}
          />
          <button onClick={addComment} disabled={busy} className="px-5 rounded-xl btn-purple font-semibold disabled:opacity-50">Send</button>
        </div>
        <div className="space-y-4">
          {video.comments?.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full btn-purple grid place-items-center font-bold text-white text-xs shrink-0">{c.authorName?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <p className="font-semibold flex items-center text-navy-900">{c.authorName}{c.isOwner && <OwnerBadge />}</p>
                <p className="text-navy-900/80">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<div className="min-h-screen pt-24 text-center text-gray-500">Loading…</div>}><WatchInner /></Suspense>;
}
