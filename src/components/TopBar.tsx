'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, storage } from '@/lib/api';
import OwnerBadge from './OwnerBadge';

const GITHUB_URL = 'https://github.com/c00lkiddev/FaceTubeV1';

export default function TopBar() {
  const [name, setName] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const router = useRouter();

  useEffect(() => {
    storage.get('uname').then(setName);
    storage.get('uid').then(setUid);
    storage.get('isOwner').then((v) => setIsOwner(v === 'true'));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      fetch(`${API_BASE}/api/suggest?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((s) => setSuggestions(Array.isArray(s) ? s.slice(0, 6) : []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSug(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  async function logout() {
    await storage.remove('uid');
    await storage.remove('uname');
    await storage.remove('email');
    await storage.remove('isOwner');
    location.href = '/';
  }

  const initial = name && name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-500/10">
      <div className="max-w-6xl mx-auto flex items-center gap-4 px-5 h-16">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl btn-purple text-base font-black grid place-items-center">F</div>
          <span className="font-extrabold text-xl tracking-tight hidden lg:block text-navy-900">Face<span className="gradient-text">Tube</span></span>
        </a>

        <form onSubmit={doSearch} className="flex-1 max-w-md relative">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSug(true); }}
            onBlur={() => setTimeout(() => setShowSug(false), 200)}
            onFocus={() => setShowSug(true)}
            placeholder="Search YouTube…"
            className="w-full bg-purple-50 border border-purple-200 rounded-full px-5 py-2 text-sm text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
          />
          {showSug && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-xl z-50">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => { setQuery(s); setShowSug(false); router.push(`/search?q=${encodeURIComponent(s)}`); }} className="w-full text-left px-5 py-2.5 text-sm text-navy-900 hover:bg-purple-50 transition">
                  🔍 {s}
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <a href="/admin" className="hidden md:block px-4 py-2 rounded-full bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 text-sm font-bold text-yellow-800 transition">👑 Admin</a>
          )}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-sm font-semibold text-purple-700 transition">GitHub</a>
          {name && uid ? (
            <>
              <a href="/upload" className="hidden md:block px-4 py-2 rounded-full btn-purple text-sm font-semibold">Upload</a>
              <a href={`/profile?id=${uid}`} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 transition">
                <span className="w-8 h-8 rounded-full btn-purple text-sm font-black grid place-items-center">{initial}</span>
                <span className="text-sm font-semibold text-navy-900 hidden md:block">{name}</span>
                {isOwner && <OwnerBadge />}
              </a>
              <button onClick={logout} className="text-sm font-semibold text-gray-500 hover:text-purple-600 transition hidden sm:block">Sign out</button>
            </>
          ) : (
            <button
  onClick={() => (window.location.href = '/login/')}
  className="px-5 py-2 rounded-full btn-purple text-sm font-bold shrink-0"
>
  Sign in
</button>
          )}
        </div>
      </div>
    </header>
  );
}
