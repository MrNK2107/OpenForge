'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Task, Project } from '@/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { fetchJson, fetchArray } from '@/lib/fetch-json';

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'backlog' as Task['status'], difficulty: 'intermediate' });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectData, tasksData] = await Promise.all([
          fetchJson<(Project & { project?: Project }) | null>(`/api/projects/${projectId}`, null),
          fetchArray<Task>(`/api/projects/${projectId}/tasks`),
        ]);
        setProject(projectData?.project || projectData);
        setTasks(tasksData);
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  const handleTaskMove = async (taskId: string, newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        setActionError(null);
      } else {
        const body = await res.json().catch(() => null);
        setActionError(body?.error || 'Could not move the task.');
      }
    } catch (error) {
      console.error('Error moving task:', error);
      setActionError('Could not move the task. Check your connection and try again.');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([...tasks, task.task || task]);
        setShowAddModal(false);
        setActionError(null);
        setNewTask({ title: '', description: '', status: 'backlog', difficulty: 'intermediate' });
      } else {
        const body = await res.json().catch(() => null);
        setActionError(body?.error || 'Could not add the task.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      setActionError('Could not add the task. Check your connection and try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-neutral-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-orange-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-neutral-100 mt-2">
            {project?.title || 'Project'} - Tasks
          </h1>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {actionError && !showAddModal && (
          <div role="alert" className="mb-4 px-4 py-3 rounded-lg border bg-red-500/10 border-red-500/20 text-red-300 text-sm">
            {actionError}
          </div>
        )}

        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onAddTask={(status) => {
            setNewTask({ ...newTask, status });
            setActionError(null);
            setShowAddModal(true);
          }}
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-neutral-100 mb-4">Add New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Difficulty</label>
                <select
                  value={newTask.difficulty}
                  onChange={(e) => setNewTask({ ...newTask, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-white/10 bg-neutral-800 text-neutral-100 placeholder-neutral-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            {actionError && (
              <p role="alert" className="mt-4 text-sm text-red-400">{actionError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-white/10 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}