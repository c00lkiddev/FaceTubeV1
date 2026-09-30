'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storage } from '@/lib/api';

export default function Upload() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [thumb, setThumb] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    const authorId = await storage.get('uid');
    if (!authorId) return alert('Sign in first');
    if (!title.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await api.videos.create({ title, url, thumb, authorId });
      router.push('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Upload a video</h1>

      <input
        className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500"
        placeholder="Video URL (mp4 or stream link)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <input
        className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500"
        placeholder="Thumbnail URL (optional)"
        value={thumb}
        onChange={(e) => setThumb(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-3 rounded-xl btn-purple text-white font-bold disabled:opacity-50"
      >
        {busy ? 'Publishing…' : 'Publish'}
      </button>
    </div>
  );
}
