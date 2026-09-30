'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, storage, API_BASE } from '@/lib/api';
import OwnerBadge from '@/components/OwnerBadge';

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`${API_BASE}/api/video/${id}`);
    setVideo(await res.json());
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function addComment() {
    const userId = await storage.get('uid');
    if (!userId || !comment.trim() || busy) return;
    setBusy(true);
    try {
      await api.comments.create({ body: comment, userId, videoId: id });
      setComment('');
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!video) return <div className="p-6 text-gray-500">Loading…</div>;
  if (video.error) return <div className="p-6 text-red-400">Not found</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <video src={video.url} controls className="w-full h-full" />
      </div>

      <h1 className="text-2xl font-bold mt-4">{video.title}</h1>
      <p className="text-gray-400 flex items-center mt-1">
        {video.authorName}
        {video.isOwner && <OwnerBadge />}
        <span className="mx-2">·</span>
        {video.views} views
      </p>

      <hr className="my-6 border-white/5" />

      <h2 className="font-semibold mb-3">
        {video.comments?.length ?? 0} Comments
      </h2>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500"
          placeholder="Add a comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          onClick={addComment}
          disabled={busy}
          className="px-5 rounded-xl btn-purple text-white font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="space-y-4">
        {video.comments?.map((c: any) => (
          <div key={c.id}>
            <p className="font-semibold flex items-center">
              {c.authorName}
              {c.isOwner && <OwnerBadge />}
            </p>
            <p className="text-gray-300">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
