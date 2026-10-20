'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Users, MessageSquare, GitPullRequest, Star } from 'lucide-react';
import type { Notification, User } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<User | null>('/api/auth/me', null),
      fetchArray<Notification>('/api/notifications'),
    ]).then(([userData, notifData]) => {
      setUser(userData);
      setNotifications(notifData);
      setLoading(false);
    });
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    });
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view notifications.</p>
          <Link href="/api/auth/github" className="text-violet-600 hover:text-violet-700 font-medium">
            Sign in with GitHub →
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-violet-600" />
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-violet-600 text-white text-sm px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-violet-600 hover:text-violet-700 text-sm font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-gray-500">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white border rounded-lg p-4 ${notif.read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${notif.read ? 'bg-gray-100' : 'bg-violet-100'}`}>
                    <NotificationIcon type={notif.type} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                    {notif.message && (
                      <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    match_found: Users,
    join_request: GitPullRequest,
    request_accepted: Star,
    task_assigned: MessageSquare,
  };
  const Icon = icons[type] || Bell;
  return <Icon className="w-5 h-5 text-violet-600" />;
}