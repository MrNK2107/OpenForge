'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, GitBranch, Users, FileText, Star } from 'lucide-react';
import type { User, Project } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';
import { plural } from '@/components/TagChip';
import { SignInPrompt } from '@/components/SignInPrompt';

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
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt title="Your dashboard" message="Sign in to see the projects you own and contribute to." />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-neutral-900 rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-orange-400">{user.username?.[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-neutral-100">Welcome, {user.username}!</h1>
                <p className="text-neutral-500">{user.bio || 'No bio yet'}</p>
              </div>
            </div>
            <Link
              href="/create"
              className="flex items-center bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-500"
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
        <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-4">My Projects</h2>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-500 mb-4">You haven&apos;t created any projects yet.</p>
              <Link
                href="/create"
                className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium"
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
                  className="border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-neutral-100">{project.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === 'draft' ? 'bg-white/10 text-neutral-400' :
                      project.status === 'seeking' ? 'bg-green-500/10 text-green-400' :
                      project.status === 'active' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-neutral-500 text-sm line-clamp-2 mb-3">{project.description}</p>
                  <div className="flex items-center text-sm text-neutral-500">
                    <Users className="w-4 h-4 mr-1" />
                    {plural(project.members?.length || 0, 'member')}
                    {project.github_repo_url && (
                      <span className="ml-3 text-orange-400">GitHub linked</span>
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
    <div className="bg-neutral-900 rounded-xl border border-white/10 p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-100">{value}</div>
          <div className="text-sm text-neutral-500">{label}</div>
        </div>
      </div>
    </div>
  );
}