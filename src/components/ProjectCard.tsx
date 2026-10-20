'use client';

import Link from 'next/link';
import { Project } from '@/types';
import { Star, Users, GitBranch, Calendar } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  showOwner?: boolean;
}

export function ProjectCard({ project, showOwner = true }: ProjectCardProps) {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-600',
    seeking: 'bg-green-100 text-green-600',
    active: 'bg-blue-100 text-blue-600',
    paused: 'bg-amber-100 text-amber-600',
    archived: 'bg-slate-100 text-slate-400',
  };

  const difficultyColors = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    advanced: 'bg-red-500',
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all group h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2">
            {project.title}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-grow">{project.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tags?.slice(0, 4).map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 text-xs bg-violet-50 text-violet-600 rounded-full"
            >
              {tag.name}
            </span>
          ))}
          {(!project.tags || project.tags.length === 0) && project.difficulty && (
            <span
              className={`px-2 py-0.5 text-xs text-white rounded-full ${
                difficultyColors[project.difficulty as keyof typeof difficultyColors] || 'bg-slate-400'
              }`}
            >
              {project.difficulty}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4">
            {(project.stars_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                {project.stars_count}
              </span>
            )}
            {project.members && project.members.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {project.members.length}
              </span>
            )}
            {project.github_repo_url && (
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {showOwner && project.owner && (
            <div className="flex items-center gap-2">
              {project.owner.avatar_url ? (
                <img
                  src={project.owner.avatar_url}
                  alt={project.owner.username}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                  <span className="text-xs text-violet-600 font-medium">
                    {project.owner.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span>{project.owner.username}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </Link>
  );
}