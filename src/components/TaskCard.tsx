'use client';

import { Task, User } from '@/types';
import { MessageSquare, Calendar, User as UserIcon } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onClick?: () => void;
}

export function TaskCard({ task, onDragStart, onClick }: TaskCardProps) {
  const statusColors = {
    backlog: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-600',
    review: 'bg-amber-100 text-amber-600',
    done: 'bg-green-100 text-green-600',
  };

  const difficultyColors = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    advanced: 'bg-red-500',
  };

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, task) : undefined}
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 text-sm leading-tight">{task.title}</h4>
        {task.difficulty && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${difficultyColors[task.difficulty as keyof typeof difficultyColors] || 'bg-slate-400'}`}
            title={task.difficulty}
          />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {task.labels.slice(0, 3).map((label) => (
          <span
            key={label}
            className="px-1.5 py-0.5 text-xs bg-violet-50 text-violet-600 rounded"
          >
            {label}
          </span>
        ))}
        {task.labels.length > 3 && (
          <span className="text-xs text-slate-400">+{task.labels.length - 3}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {task.github_issue_url && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              #{task.github_issue_number}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {task.assignee && (
          <div className="flex items-center gap-1">
            {task.assignee.avatar_url ? (
              <img
                src={task.assignee.avatar_url}
                alt={task.assignee.username}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}