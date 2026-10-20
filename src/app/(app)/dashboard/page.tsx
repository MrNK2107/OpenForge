'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, GitBranch, Users, FileText, Star } from 'lucide-react';
import type { User, Project } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<User | null>('/api/auth/me', null)
      .then((data) => {
        setUser(data);
        if (data?.id) {
          fetchArray<Project>(`/api/projects?owner=${encodeURIComponent(data.id)}`)
            .then(setProjects)
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

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
          <p className="text-gray-600 mb-4">Please sign in to access your dashboard.</p>
          <Link href="/api/auth/github" className="text-violet-600 hover:text-violet-700 font-medium">
            Sign in with GitHub →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-violet-600">{user.username?.[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.username}!</h1>
                <p className="text-gray-500">{user.bio || 'No bio yet'}</p>
              </div>
            </div>
            <Link
              href="/create"
              className="flex items-center bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={GitBranch} label="My Projects" value={projects.length} />
          <StatCard icon={Users} label="Contributing" value={0} />
          <StatCard icon={FileText} label="Open Tasks" value={0} />
          <StatCard icon={Star} label="Stars Earned" value={0} />
        </div>

        {/* My Projects */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-4">My Projects</h2>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">You haven&apos;t created any projects yet.</p>
              <Link
                href="/create"
                className="inline-flex items-center text-violet-600 hover:text-violet-700 font-medium"
              >
                <Plus className="w-4 h-4 mr-1" /> Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      project.status === 'seeking' ? 'bg-green-100 text-green-700' :
                      project.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{project.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    {project.members?.length || 0} members
                    {project.github_repo_url && (
                      <span className="ml-3 text-violet-600">GitHub linked</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}