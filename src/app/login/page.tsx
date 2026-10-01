'use client';
import { useState, useRef, useEffect } from 'react';
import { api, storage } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    async function handleSubmit(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      if (busyRef.current) return;

      setErr('');
      setBusy(true);

      try {
        const data = await api.auth.login({ email, name, password, mode });
        if (data && data.id) {
          await storage.set('uid', data.id);
          await storage.set('uname', data.name);
          await storage.set('email', email);
          await storage.set('isOwner', data.isOwner ? 'true' : 'false');
          window.location.href = '/';
        } else {
          setErr((data && data.error) || 'Something went wrong');
        }
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('401') || msg.includes('Bad creds')) {
          setErr('Wrong email or password');
        } else if (msg.includes('403')) {
          setErr('Account banned');
        } else if (msg.includes('400')) {
          setErr('Email already registered');
        } else if (msg.includes('fetch') || msg.includes('Network')) {
          setErr('Check your internet');
        } else {
          setErr('Something went wrong');
        }
      } finally {
        setBusy(false);
      }
    }

    form.addEventListener('submit', handleSubmit as EventListener);
    return () => form.removeEventListener('submit', handleSubmit as EventListener);
  }, [email, name, password, mode]);

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-16">
      <div className="w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl btn-purple mx-auto grid place-items-center text-2xl font-black text-white mb-6">
          F
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 text-navy-900">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        <form ref={formRef} className="card space-y-3">
          {mode === 'register' && (
            <input
              name="name"
              autoComplete="name"
              className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-navy-900 placeholder-gray-400 focus:outline-none focus:border-purple-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <p className="text-xs text-red-500">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl btn-purple font-bold disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          {mode === 'login' ? "No account?" : 'Have one?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-purple-600 font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
