'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User as UserIcon, Plus } from 'lucide-react';
import type { User } from '@/types';
import { isSupabaseConfigured } from '@/lib/config';
import { fetchJson } from '@/lib/fetch-json';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetchJson<User | null>('/api/auth/me', null).then(setUser);
  }, []);

  // Close the mobile menu on navigation.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setIsMenuOpen(false);
  }

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${pathname?.startsWith(href) ? 'text-orange-300' : 'text-neutral-400 hover:text-white'}`;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  const isAuthPage = pathname?.startsWith('/api');

  if (isAuthPage) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs sm:text-sm text-center px-4 py-1.5">
          <strong className="font-semibold">Demo mode</strong>{' · '}Supabase is not configured, so you are seeing sample data. Sign-in and edits are disabled.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="of-mark" />
              <span className="text-xl font-bold text-neutral-100">OpenForge</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/explore" className={linkClass('/explore')}>
              Explore
            </Link>
            {!user && !isSupabaseConfigured && (
              <Link href="/matches" className={linkClass('/matches')}>
                Matches
              </Link>
            )}
            {user ? (
              <>
                <Link href="/dashboard" className={linkClass('/dashboard')}>
                  Dashboard
                </Link>
                <Link href="/matches" className={linkClass('/matches')}>
                  Matches
                </Link>
                <Link
                  href="/create"
                  className="flex items-center space-x-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-500"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </Link>
                <div className="flex items-center space-x-3">
                  <Link href="/profile" className="flex items-center space-x-2">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-orange-400" />
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-neutral-500 hover:text-neutral-300"
                    aria-label="Log out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/api/auth/github"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-500"
              >
                Sign in with GitHub
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-neutral-400"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-neutral-900 px-4 py-4 space-y-4">
          <Link href="/explore" className="block text-neutral-400">
            Explore
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block text-neutral-400">
                Dashboard
              </Link>
              <Link href="/create" className="block text-orange-400 font-medium">
                Create Project
              </Link>
              <button onClick={handleLogout} className="block text-neutral-400">
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/api/auth/github"
              className="block bg-orange-600 text-white text-center px-4 py-2 rounded-lg"
            >
              Sign in with GitHub
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}