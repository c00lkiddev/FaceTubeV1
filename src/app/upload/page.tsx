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
    <div className="min-h-screen pt-24 pb-12 px-5">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-3xl font-black text-navy-900">Upload a video</h1>

        <input
          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
          placeholder="Video URL (mp4 or YouTube link)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
          placeholder="Thumbnail URL (optional)"
          value={thumb}
          onChange={(e) => setThumb(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-3 rounded-xl btn-purple font-bold disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
