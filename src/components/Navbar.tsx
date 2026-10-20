'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Rocket, Menu, X, LogOut, User as UserIcon, Plus } from 'lucide-react';
import type { User } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  const isAuthPage = pathname?.startsWith('/api');

  if (isAuthPage) return null;

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Rocket className="w-8 h-8 text-violet-600" />
              <span className="text-xl font-bold text-gray-900">OpenForge</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/explore" className="text-gray-600 hover:text-gray-900">
              Explore
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/matches" className="text-gray-600 hover:text-gray-900">
                  Matches
                </Link>
                <Link
                  href="/create"
                  className="flex items-center space-x-1 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
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
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-violet-600" />
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/api/auth/github"
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Sign in with GitHub
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-4">
          <Link href="/explore" className="block text-gray-600">
            Explore
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block text-gray-600">
                Dashboard
              </Link>
              <Link href="/create" className="block text-violet-600 font-medium">
                Create Project
              </Link>
              <button onClick={handleLogout} className="block text-gray-600">
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/api/auth/github"
              className="block bg-gray-900 text-white text-center px-4 py-2 rounded-lg"
            >
              Sign in with GitHub
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}