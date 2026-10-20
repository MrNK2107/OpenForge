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
    if (!currentUser) return;
    await fetch(`/api/projects/${params.id}/star`, { method: 'POST' });
    window.location.reload();
  };

  const handleJoin = async () => {
    if (!currentUser) return;
    await fetch(`/api/projects/${params.id}/join`, { method: 'POST' });
    alert('Join request sent!');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Project not found</p>
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
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  project.status === 'seeking' ? 'bg-green-100 text-green-700' :
                  project.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-gray-600 max-w-2xl">{project.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleStar} className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Star className="w-4 h-4 mr-2" /> Star ({project.stars_count || 0})
              </button>
              {project.github_repo_url && (
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  <GitBranch className="w-4 h-4 mr-2" /> View on GitHub
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              )}
              {isOwner && (
                <Link href={`/projects/${project.id}/settings`} className="p-2 border rounded-lg hover:bg-gray-50">
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
              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {project.difficulty}
              </span>
            )}
            {project.time_commitment && (
              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {project.time_commitment}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
            <span className="flex items-center"><Star className="w-4 h-4 mr-1" /> {project.stars_count || 0} stars</span>
            <span className="flex items-center"><Users className="w-4 h-4 mr-1" /> {plural(project.members?.length || 0, 'member')}</span>
            <span className="flex items-center"><GitBranch className="w-4 h-4 mr-1" /> {taskStats.total} tasks</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Board Preview */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Task Board</h2>
                <Link href={`/projects/${project.id}/tasks`} className="text-violet-600 hover:text-violet-700 text-sm">
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
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-semibold mb-4">Open Roles</h2>
              {project.roles_needed && project.roles_needed.length > 0 ? (
                <div className="space-y-3">
                  {project.roles_needed.map((role: { id: string; role_name: string; filled: boolean }) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <span className="font-medium">{role.role_name}</span>
                        {role.filled ? (
                          <span className="ml-2 text-sm text-green-600">Filled</span>
                        ) : (
                          <span className="ml-2 text-sm text-orange-600">Open</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No open roles specified</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-semibold mb-4">Team</h2>
              <div className="space-y-3">
                {project.members?.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    {member.user?.avatar_url ? (
                      <img src={member.user.avatar_url} className="w-10 h-10 rounded-full" alt={member.user.username} />
                    ) : (
                      <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                        <span className="text-violet-600 font-medium">{member.user?.username?.[0]}</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{member.user?.username}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border p-6">
              {!isOwner && currentUser && (
                <button
                  onClick={handleJoin}
                  className="w-full bg-violet-600 text-white py-3 rounded-lg hover:bg-violet-700"
                >
                  Request to Join
                </button>
              )}
              {!currentUser && (
                <Link href="/api/auth/github" className="block text-center text-violet-600 hover:text-violet-700">
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
    gray: 'bg-gray-100',
    blue: 'bg-blue-100',
    yellow: 'bg-yellow-100',
    green: 'bg-green-100',
  };
  return (
    <div className={`${colors[color]} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}