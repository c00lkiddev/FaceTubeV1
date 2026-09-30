'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';

function SearchInner() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setVideos(Array.isArray(d) ? d : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-5">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-2 text-navy-900">
          Results for <span className="gradient-text">&ldquo;{q}&rdquo;</span>
        </h1>
        <p className="text-gray-500 mb-8">
          Click any video to play it right here on FaceTube.
        </p>

        {loading && <p className="text-gray-500">Searching…</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v: any) => {
            const id = v.id?.videoId || v.id;
            const s = v.snippet;
            return (
              <a
                key={id}
                href={`/youtube/${id}?t=${encodeURIComponent(s.title)}`}
                className="group block"
              >
                <div className="aspect-video rounded-2xl overflow-hidden bg-purple-50 border border-purple-100 group-hover:border-purple-300 transition">
                  <img
                    src={s.thumbnails.medium.url}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="mt-2 font-bold text-navy-900 group-hover:text-purple-600 line-clamp-2">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.channelTitle}</p>
              </a>
            );
          })}
        </div>

        {!loading && videos.length === 0 && q && (
          <p className="text-gray-500">No results.</p>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-24 text-center text-gray-500">
          Loading…
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
