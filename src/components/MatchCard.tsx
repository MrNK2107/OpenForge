'use client';

import Link from 'next/link';
import { MatchResult } from '@/types';
import { Star, Users, Zap } from 'lucide-react';

interface MatchCardProps {
  match: MatchResult;
}

export function MatchCard({ match }: MatchCardProps) {
  const { project, score, reasons } = match;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all group h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2">
            {project.title}
          </h3>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${getScoreColor(score)}`}>
            <Zap className="w-3.5 h-3.5" />
            {Math.round(score)}%
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
        )}

        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {reasons.slice(0, 4).map((reason) => (
              <span
                key={reason}
                className="px-2 py-0.5 text-xs bg-violet-50 text-violet-600 rounded-full"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 mt-auto">
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
          </div>

          {project.owner && (
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
        </div>
      </div>
    </Link>
  );
}