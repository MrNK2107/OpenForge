'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Users, MessageSquare, GitPullRequest, Star } from 'lucide-react';
import type { Notification, User } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';
import { SignInPrompt } from '@/components/SignInPrompt';

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
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt title="Notifications" message="Sign in to see join requests, matches and project updates." />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-neutral-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-orange-600 text-white text-sm px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-neutral-900 rounded-xl border border-white/10 p-12 text-center">
            <Bell className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-neutral-500">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-neutral-900 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg p-4 ${notif.read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${notif.read ? 'bg-white/10' : 'bg-orange-500/10'}`}>
                    <NotificationIcon type={notif.type} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-100">{notif.title}</h3>
                    {notif.message && (
                      <p className="text-neutral-400 text-sm mt-1">{notif.message}</p>
                    )}
                    <p className="text-neutral-500 text-xs mt-2">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-2 text-neutral-500 hover:text-neutral-300"
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
  return <Icon className="w-5 h-5 text-orange-400" />;
}