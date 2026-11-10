'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: Task['status']) => void;
}

const columns: { id: Task['status']; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAddTask }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {} as Record<Task['status'], Task[]>);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (draggedTask && onTaskMove && draggedTask.status !== newStatus) {
      onTaskMove(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className={`flex-shrink-0 w-72 bg-white/5 rounded-lg p-3 ${
            dragOverColumn === column.id ? 'ring-2 ring-orange-500 ring-opacity-50' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-neutral-300 text-sm">{column.title}</h3>
              <span className="text-xs text-neutral-500 bg-white/10 px-1.5 py-0.5 rounded">
                {tasksByStatus[column.id].length}
              </span>
            </div>
            {onAddTask && (
              <button
                onClick={() => onAddTask(column.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Add task"
              >
                <Plus className="w-4 h-4 text-neutral-500" />
              </button>
            )}
          </div>

          <div className="space-y-2 min-h-[200px]">
            {tasksByStatus[column.id].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDragStart={onTaskMove ? handleDragStart : undefined}
                onClick={onTaskClick ? () => onTaskClick(task) : undefined}
              />
            ))}
            {tasksByStatus[column.id].length === 0 && (
              <p className="text-xs text-neutral-500 text-center py-4">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}