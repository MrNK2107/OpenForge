'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Clock, Users, ExternalLink } from 'lucide-react';
import type { User } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';
import { TagChip, plural } from '@/components/TagChip';
import { SignInPrompt } from '@/components/SignInPrompt';

interface Match {
  project: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    time_commitment: string;
    tags: Array<{ tag: { name: string; color: string } }>;
    roles_needed: Array<{ role_name: string; filled: boolean }>;
  };
  score: number;
  reasons: string[];
}

export default function MatchesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<User | null>('/api/auth/me', null),
      fetchArray<Match>('/api/matches'),
    ]).then(([userData, matchesData]) => {
      setUser(userData);
      setMatches(matchesData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // In demo mode there is no user, but /api/matches still returns sample matches.
  if (!user && matches.length === 0) {
    return <SignInPrompt title="Your matches" message="Sign in so we can match projects to your skills and availability." />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Matches</h1>
        <p className="text-gray-600 mb-8">
          Projects that match your skills, availability, and interests.
        </p>

        {matches.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matches yet</h3>
            <p className="text-gray-500 mb-4">
              Complete your profile with skills to get better matches.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center text-violet-600 hover:text-violet-700 font-medium"
            >
              Update Profile →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {matches.map((match) => (
              <div key={match.project.id} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">{match.project.title}</h2>
                      <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium">
                        {match.score}% Match
                      </span>
                    </div>
                    <p className="text-gray-600">{match.project.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {match.project.tags?.slice(0, 5).map((tag: { tag: { name: string; color: string } }) => (
                    <TagChip key={tag.tag.name} name={tag.tag.name} color={tag.tag.color} />
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    {match.project.difficulty && (
                      <span className="flex items-center">
                        <Zap className="w-4 h-4 mr-1" /> {match.project.difficulty}
                      </span>
                    )}
                    {match.project.time_commitment && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" /> {match.project.time_commitment}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {plural(match.project.roles_needed?.filter((r: { filled: boolean }) => !r.filled).length || 0, 'open role')}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Matched because:</span> {match.reasons.join(', ')}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Link
                    href={`/projects/${match.project.id}`}
                    className="flex-1 text-center bg-violet-600 text-white py-2 rounded-lg hover:bg-violet-700"
                  >
                    View Project
                  </Link>
                  <Link
                    href={`/projects/${match.project.id}`}
                    className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Request to Join
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}