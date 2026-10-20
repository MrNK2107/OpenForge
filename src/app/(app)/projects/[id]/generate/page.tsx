'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Project } from '@/types';
import { generateRepoFiles } from '@/lib/repo-templates';
import { ArrowLeft, FileText, GitBranch, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { fetchJson, fetchArray } from '@/lib/fetch-json';

export default function GenerateRepoPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [starterIssues, setStarterIssues] = useState<Array<{ title: string; labels: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; repo_url?: string; error?: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const data = await fetchJson<(Project & { project?: Project }) | null>(`/api/projects/${projectId}`, null);
        const projectData = data?.project || data;
        setProject(projectData);

        if (projectData) {
          const slug = projectData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const { files: generatedFiles, starterIssues: issues } = generateRepoFiles(
            projectData.template_type || 'web-app',
            {
              title: projectData.title,
              description: projectData.description || '',
              license: projectData.license || 'MIT',
              owner: '',
              slug,
            }
          );
          setFiles(generatedFiles);
          setStarterIssues(issues);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [projectId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-repo`, {
        method: 'POST',
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to generate repository' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Generate GitHub Repository</h1>
          <p className="text-slate-500 mt-1">Create a GitHub repo with starter files and starter issues</p>
        </div>

        {project.github_repo_url && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Repository Already Created</p>
              <a
                href={project.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:underline"
              >
                {project.github_repo_url}
              </a>
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg p-4 mb-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Repository created successfully!</p>
                  <a
                    href={result.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:underline"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="font-medium text-red-800">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Files to Create</h2>
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {Object.keys(files).map((filename) => (
                <button
                  key={filename}
                  onClick={() => setSelectedFile(selectedFile === filename ? null : filename)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                    selectedFile === filename ? 'bg-violet-50' : ''
                  }`}
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{filename}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">File Preview</h2>
            <div className="bg-slate-900 rounded-lg p-4 max-h-[500px] overflow-auto">
              {selectedFile ? (
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                  {files[selectedFile]}
                </pre>
              ) : (
                <p className="text-slate-500 text-sm">Select a file to preview</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Starter Issues</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {starterIssues.map((issue, index) => (
              <div key={index} className="px-4 py-3">
                <p className="font-medium text-slate-700">{issue.title}</p>
                <div className="flex gap-2 mt-2">
                  {issue.labels.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded-full"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating || !!project.github_repo_url}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4" />
                {project.github_repo_url ? 'Repo Already Created' : 'Generate Repository'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}