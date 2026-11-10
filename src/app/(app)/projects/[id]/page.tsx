'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Star, GitBranch, ExternalLink, Settings } from 'lucide-react';
import type { Project, Task } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';
import { TagChip, plural } from '@/components/TagChip';

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<Project | null>(`/api/projects/${params.id}`, null),
      fetchArray<Task>(`/api/projects/${params.id}/tasks`),
      fetchJson<{ id: string } | null>('/api/auth/me', null),
    ]).then(([projectData, tasksData, userData]) => {
      setProject(projectData);
      setTasks(tasksData);
      setCurrentUser(userData);
      setLoading(false);
    });
  }, [params.id]);

  const handleStar = async () => {
    if (!currentUser) {
      setActionMsg({ kind: 'error', text: 'Sign in to star projects.' });
      return;
    }
    const res = await fetch(`/api/projects/${params.id}/star`, { method: 'POST' });
    if (res.ok) {
      window.location.reload();
    } else {
      const body = await res.json().catch(() => null);
      setActionMsg({ kind: 'error', text: body?.error || 'Could not star this project.' });
    }
  };

  const handleJoin = async () => {
    if (!currentUser) return;
    const res = await fetch(`/api/projects/${params.id}/join`, { method: 'POST' });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setActionMsg({ kind: 'success', text: 'Join request sent!' });
    } else {
      setActionMsg({ kind: 'error', text: body?.error || 'Could not send the join request.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Project not found</p>
      </div>
    );
  }

  const isOwner = currentUser?.id === project.owner_id;
  const taskStats = {
    total: tasks.length,
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-neutral-100">{project.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  project.status === 'seeking' ? 'bg-green-500/10 text-green-400' :
                  project.status === 'active' ? 'bg-blue-500/10 text-blue-400' :
                  project.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-white/10 text-neutral-400'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-neutral-400 max-w-2xl">{project.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleStar} className="flex items-center px-4 py-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg hover:bg-white/5">
                <Star className="w-4 h-4 mr-2" /> Star ({project.stars_count || 0})
              </button>
              {project.github_repo_url && (
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500"
                >
                  <GitBranch className="w-4 h-4 mr-2" /> View on GitHub
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              )}
              {isOwner && (
                <Link href={`/projects/${project.id}/settings`} className="p-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg hover:bg-white/5">
                  <Settings className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(project.tags as unknown as Array<{ id: string; name: string; color: string }>)?.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {project.difficulty && (
              <span className="px-3 py-1 rounded-full text-sm bg-white/10 text-neutral-300">
                {project.difficulty}
              </span>
            )}
            {project.time_commitment && (
              <span className="px-3 py-1 rounded-full text-sm bg-white/10 text-neutral-300">
                {project.time_commitment}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 mt-4 text-sm text-neutral-500">
            <span className="flex items-center"><Star className="w-4 h-4 mr-1" /> {project.stars_count || 0} stars</span>
            <span className="flex items-center"><Users className="w-4 h-4 mr-1" /> {plural(project.members?.length || 0, 'member')}</span>
            <span className="flex items-center"><GitBranch className="w-4 h-4 mr-1" /> {taskStats.total} tasks</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {actionMsg && (
          <div
            role={actionMsg.kind === 'error' ? 'alert' : 'status'}
            className={`mb-6 px-4 py-3 rounded-lg border text-sm ${
              actionMsg.kind === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                : 'bg-green-500/10 border-green-500/20 text-green-300'
            }`}
          >
            {actionMsg.text}
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Board Preview */}
            <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Task Board</h2>
                <Link href={`/projects/${project.id}/tasks`} className="text-orange-400 hover:text-orange-300 text-sm">
                  View Full Board →
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <TaskColumn title="Backlog" count={taskStats.backlog} color="gray" />
                <TaskColumn title="In Progress" count={taskStats.in_progress} color="blue" />
                <TaskColumn title="Review" count={taskStats.review} color="yellow" />
                <TaskColumn title="Done" count={taskStats.done} color="green" />
              </div>
            </div>

            {/* Open Roles */}
            <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4">Open Roles</h2>
              {project.roles_needed && project.roles_needed.length > 0 ? (
                <div className="space-y-3">
                  {project.roles_needed.map((role: { id: string; role_name: string; filled: boolean }) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg">
                      <div className="flex items-center">
                        <span className="font-medium">{role.role_name}</span>
                        {role.filled ? (
                          <span className="ml-2 text-sm text-green-400">Filled</span>
                        ) : (
                          <span className="ml-2 text-sm text-orange-400">Open</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No open roles specified</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team */}
            <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold mb-4">Team</h2>
              <div className="space-y-3">
                {project.members?.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    {member.user?.avatar_url ? (
                      <img src={member.user.avatar_url} className="w-10 h-10 rounded-full" alt={member.user.username} />
                    ) : (
                      <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <span className="text-orange-400 font-medium">{member.user?.username?.[0]}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{member.user?.username}</div>
                      <div className="text-sm text-neutral-500">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-neutral-900 rounded-xl border border-white/10 p-6">
              {!isOwner && currentUser && (
                <button
                  onClick={handleJoin}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-500"
                >
                  Request to Join
                </button>
              )}
              {!currentUser && (
                <Link href="/api/auth/github" className="block text-center text-orange-400 hover:text-orange-300">
                  Sign in to join
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskColumn({ title, count, color }: { title: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-white/10',
    blue: 'bg-blue-500/10',
    yellow: 'bg-yellow-500/10',
    green: 'bg-green-500/10',
  };
  return (
    <div className={`${colors[color]} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm text-neutral-400">{title}</div>
    </div>
  );
}