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
    if (score >= 80) return 'text-green-400 bg-green-500/10';
    if (score >= 60) return 'text-blue-400 bg-blue-500/10';
    if (score >= 40) return 'text-amber-400 bg-amber-500/10';
    return 'text-neutral-400 bg-neutral-950';
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-neutral-900 rounded-xl border border-white/10 p-5 hover:shadow-lg transition-all group h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg text-neutral-100 group-hover:text-orange-400 transition-colors line-clamp-2">
            {project.title}
          </h3>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${getScoreColor(score)}`}>
            <Zap className="w-3.5 h-3.5" />
            {Math.round(score)}%
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{project.description}</p>
        )}

        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {reasons.slice(0, 4).map((reason) => (
              <span
                key={reason}
                className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-400 rounded-full"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-white/5 mt-auto">
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
                <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xs text-orange-400 font-medium">
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