"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden font-body">
      {/* Deep Space Aesthetic Background */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md p-8 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/30 rounded-3xl shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-on-surface mb-2 tracking-tight">Playground</h1>
          <p className="text-on-surface-variant text-sm font-mono uppercase tracking-widest">Authentication System</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-outline uppercase mb-2">Username / Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-outline uppercase mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-container-highest border border-outline-variant/50 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-primary text-on-primary font-display font-semibold py-3 rounded-xl hover:bg-primary-fixed transition-all hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
