'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { Project } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { fetchArray } from '@/lib/fetch-json';

function ExploreContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || 'all');

  // The search box only applies on submit; filters apply immediately.
  const [appliedSearch, setAppliedSearch] = useState(search);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (difficulty !== 'all') params.set('difficulty', difficulty);
    if (appliedSearch) params.set('search', appliedSearch);

    fetchArray<Project>(`/api/projects?${params}`).then((data) => {
      if (cancelled) return;
      setProjects(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [status, difficulty, appliedSearch, reloadKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAppliedSearch(search.trim());
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Explore Projects</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <button type="submit" className="bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700">
                Search
              </button>
            </form>

            <div className="flex gap-4">
              <select
                value={status}
                onChange={(e) => {
                  setLoading(true);
                  setStatus(e.target.value);
                }}
                className="border rounded-lg px-4 py-3 bg-white"
              >
                <option value="all">All Status</option>
                <option value="seeking">Seeking Contributors</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>

              <select
                value={difficulty}
                onChange={(e) => {
                  setLoading(true);
                  setDifficulty(e.target.value);
                }}
                className="border rounded-lg px-4 py-3 bg-white"
              >
                <option value="all">All Difficulty</option>
                <option value="beginner-friendly">Beginner-friendly</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border rounded-xl p-5 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-3 w-3/4" />
                <div className="h-4 bg-gray-200 rounded mb-4 w-full" />
                <div className="flex gap-2 mb-4">
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No projects found. Be the first to create one!</p>
            <Link href="/create" className="inline-block mt-4 text-violet-600 hover:text-violet-700 font-medium">
              Create a Project →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExploreContent />
    </Suspense>
  );
}