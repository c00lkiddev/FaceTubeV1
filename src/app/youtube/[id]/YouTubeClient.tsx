'use client';
import { useEffect, useState } from 'react';
import VideoPlayer from '@/components/VideoPlayer';

export default function YouTubeClient() {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const vid = parts[1] || '';
    setId(vid);
    const t = new URLSearchParams(window.location.search).get('t');
    if (t) setTitle(t);
  }, []);

  if (!id) {
    return (
      <div className="min-h-screen pt-24 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-5">
      <div className="max-w-3xl mx-auto">
        <VideoPlayer src={`https://www.youtube.com/watch?v=${id}`} />
        {title && (
          <h1 className="text-2xl font-bold mt-5 text-navy-900">{title}</h1>
        )}
        <p className="text-gray-500 mt-2 text-sm">
          Playing from YouTube, embedded on FaceTube.
        </p>
      </div>
    </div>
  );
}
