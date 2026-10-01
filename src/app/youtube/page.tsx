'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

function YouTubeInner() {
  const params = useSearchParams();
  const id = params.get('id') || '';
  const title = params.get('t') || '';
  if (!id) return <div className="min-h-screen pt-24 text-center text-gray-500">No video</div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-5">
      <div className="max-w-3xl mx-auto">
        <VideoPlayer src={`https://www.youtube.com/watch?v=${id}`} />
        {title && <h1 className="text-2xl font-bold mt-5 text-navy-900">{title}</h1>}
        <p className="text-gray-500 mt-2 text-sm">Playing from YouTube, embedded on FaceTube.</p>
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 px-5 py-2 rounded-full bg-purple-50 text-purple-700 font-semibold text-sm border border-purple-200">
          Open on YouTube →
        </a>
      </div>
    </div>
  );
}

export default function YouTubePage() {
  return <Suspense fallback={<div className="min-h-screen pt-24 text-center text-gray-500">Loading…</div>}><YouTubeInner /></Suspense>;
}
