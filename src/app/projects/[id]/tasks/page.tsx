'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Task, Project } from '@/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'backlog' as Task['status'], difficulty: 'intermediate' });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectRes, tasksRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/tasks`)
        ]);
        const projectData = await projectRes.json();
        const tasksData = await tasksRes.json();
        setProject(projectData.project || projectData);
        setTasks(tasksData.tasks || tasksData || []);
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
      }
    } catch (error) {
      console.error('Error moving task:', error);
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
        setNewTask({ title: '', description: '', status: 'backlog', difficulty: 'intermediate' });
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {project?.title || 'Project'} - Tasks
          </h1>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onAddTask={(status) => {
            setNewTask({ ...newTask, status });
            setShowAddModal(true);
          }}
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value as Task['status'] })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  value={newTask.difficulty}
                  onChange={(e) => setNewTask({ ...newTask, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
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