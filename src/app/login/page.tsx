'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storage } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function go() {
    setErr('');
    setBusy(true);
    try {
      const data = await api.auth.login({ email, name, password, mode });
      if (data.id) {
        await storage.set('uid', data.id);
        await storage.set('uname', data.name);
        await storage.set('email', email);
        await storage.set('isOwner', data.isOwner ? 'true' : 'false');
        router.push('/');
      } else {
        setErr(data.error || 'Something went wrong');
      }
    } catch {
      setErr('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'login' ? 'Sign in to FaceTube' : 'Create account'}
        </h1>

        <div className="rounded-2xl glass p-5 space-y-3">
          {mode === 'register' && (
            <input
              className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full bg-navy-850 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <p className="text-xs text-red-400">{err}</p>}

          <button
            onClick={go}
            disabled={busy}
            className="w-full py-2.5 rounded-xl btn-purple text-white font-semibold disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have one?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-purple-400 font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
