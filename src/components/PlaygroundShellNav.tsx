"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  designation: string;
  avatar: string | null;
  avatarColor: string;
};

export default function PlaygroundLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (pathname !== '/login') {
      fetch('/api/auth/me')
        .then(res => {
          if (!res.ok) throw new Error('Not authenticated');
          return res.json();
        })
        .then(data => setUser(data))
        .catch(() => router.push('/login'));
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  if (pathname === '/login') return <>{children}</>;
  if (!user) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-[280px] bg-surface-container/50 border-r border-outline-variant/50 backdrop-blur-xl flex flex-col z-20 shrink-0">
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">token</span>
            Playground
          </h1>
          <p className="text-xs font-mono text-outline uppercase tracking-widest">Enterprise Edition</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 custom-scrollbar">
          <div className="mb-4">
            <p className="px-4 text-[10px] font-mono text-outline uppercase tracking-wider mb-2">Main Navigation</p>
            <Link href="/" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${pathname === '/' ? 'text-primary font-bold border-r-2 border-primary bg-surface-variant/50' : 'text-on-surface-variant font-body hover:bg-surface-variant'}`}>
              <span className="material-symbols-outlined">dashboard</span>
              <span>Launchpad</span>
            </Link>
          </div>

          {user.role === 'ADMIN' && (
            <div className="mb-4">
              <p className="px-4 text-[10px] font-mono text-outline uppercase tracking-wider mb-2">Administration</p>
              <Link href="/users" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${pathname === '/users' ? 'text-primary font-bold border-r-2 border-primary bg-surface-variant/50' : 'text-on-surface-variant font-body hover:bg-surface-variant'}`}>
                <span className="material-symbols-outlined">group</span>
                <span>User Master</span>
              </Link>
              <Link href="/apps" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${pathname === '/apps' ? 'text-primary font-bold border-r-2 border-primary bg-surface-variant/50' : 'text-on-surface-variant font-body hover:bg-surface-variant'}`}>
                <span className="material-symbols-outlined">apps</span>
                <span>App Master</span>
              </Link>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant/50 bg-surface-container-low/30 backdrop-blur-md">
          <div className="flex flex-col gap-1 mb-4">
            <Link href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant font-body-sm text-sm hover:bg-surface-variant transition-colors duration-200">
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-error font-body-sm text-sm hover:bg-error/20 transition-colors duration-200 text-left">
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-4 mt-2 bg-surface-container-low rounded-xl">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 shrink-0 rounded-full bg-${user.avatarColor}/20 flex items-center justify-center border border-${user.avatarColor}/30 overflow-hidden`}>
                {user.avatar ? (
                  <img alt={user.name} className="w-full h-full object-cover" src={user.avatar} />
                ) : (
                  <span className={`text-${user.avatarColor} font-display font-bold`}>{user.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-display text-sm font-semibold truncate text-on-surface">{user.name}</span>
                <span className="font-body text-[10px] truncate text-outline">{user.designation || 'Playground User'}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-outline-variant/30 flex items-center px-8 shrink-0 bg-surface/50 backdrop-blur-md z-10">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <button className="hover:text-primary transition-colors">
              <span className="material-symbols-outlined">search</span>
            </button>
            <button className="hover:text-primary transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
