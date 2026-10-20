'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Save, Rocket } from 'lucide-react';
import type { Tag } from '@/types';

type Step = 'idea' | 'tech' | 'roles' | 'generate';

const TEMPLATES = [
  { id: 'web-app', name: 'Web App', description: 'Full-stack web application' },
  { id: 'cli', name: 'CLI Tool', description: 'Command-line interface tool' },
  { id: 'library', name: 'Library', description: 'Reusable code library or package' },
  { id: 'data', name: 'Data Project', description: 'Data analysis or ML project' },
];

export default function CreateProjectPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [step, setStep] = useState<Step>('idea');
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner-friendly',
    scope: 'side-project',
    time_commitment: '2-5 hrs/week',
    license: 'MIT',
    template_type: 'web-app',
    roles_needed: [] as string[],
  });

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags,
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (error) {
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles_needed: prev.roles_needed.includes(role)
        ? prev.roles_needed.filter((r) => r !== role)
        : [...prev.roles_needed, role],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/dashboard" className="text-violet-600 hover:text-violet-700 flex items-center mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {['idea', 'tech', 'roles', 'generate'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-violet-600 text-white' : 
                ['idea', 'tech', 'roles', 'generate'].indexOf(step) > i ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`w-16 h-1 mx-2 ${['idea', 'tech', 'roles', 'generate'].indexOf(step) > i ? 'bg-violet-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-8">
          {step === 'idea' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Tell us about your idea</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., EcoTracker - Carbon Footprint Dashboard"
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your project idea, goals, and what problem it solves..."
                  rows={5}
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty *</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    <option value="beginner-friendly">Beginner-friendly</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    <option value="weekend">Weekend Project</option>
                    <option value="side-project">Side Project</option>
                    <option value="startup">Startup Seed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Commitment</label>
                  <select
                    value={formData.time_commitment}
                    onChange={(e) => setFormData({ ...formData, time_commitment: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    <option value="1-2 hrs/week">1-2 hrs/week</option>
                    <option value="2-5 hrs/week">2-5 hrs/week</option>
                    <option value="5-10 hrs/week">5-10 hrs/week</option>
                    <option value="10+ hrs/week">10+ hrs/week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License</label>
                  <select
                    value={formData.license}
                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    <option value="MIT">MIT</option>
                    <option value="Apache 2.0">Apache 2.0</option>
                    <option value="GPL 3.0">GPL 3.0</option>
                    <option value="BSD">BSD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 'tech' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Select Tech Stack & Tags</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tech Stack</label>
                <div className="flex flex-wrap gap-2">
                  {tags.filter((t) => t.category === 'tech').map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedTags.includes(tag.name)
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                <div className="flex flex-wrap gap-2">
                  {tags.filter((t) => t.category === 'domain').map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedTags.includes(tag.name)
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'roles' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Roles Needed</h2>

              <div className="grid grid-cols-2 gap-4">
                {['Frontend', 'Backend', 'Full Stack', 'Design', 'DevOps', 'Data Science', 'Documentation'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`p-4 border rounded-lg text-left transition ${
                      formData.roles_needed.includes(role)
                        ? 'border-violet-600 bg-violet-50'
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.roles_needed.includes(role)}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <span className="font-medium">{role}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'generate' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Repository Template</h2>

              <div className="grid grid-cols-2 gap-4">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, template_type: template.id })}
                    className={`p-4 border rounded-lg text-left transition ${
                      formData.template_type === template.id
                        ? 'border-violet-600 bg-violet-50'
                        : 'hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="template"
                        checked={formData.template_type === template.id}
                        onChange={() => {}}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">What will be generated:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ README.md with project setup instructions</li>
                  <li>✓ CONTRIBUTING.md guidelines</li>
                  <li>✓ LICENSE file ({formData.license})</li>
                  <li>✓ GitHub issue templates (bug, feature, good first issue)</li>
                  <li>✓ Pull request template</li>
                  <li>✓ GitHub Actions CI workflow</li>
                  <li>✓ .gitignore for {formData.template_type}</li>
                  <li>✓ 3 starter "good first issues"</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t">
            {step !== 'idea' && (
              <button
                onClick={() => setStep(step === 'generate' ? 'roles' : step === 'roles' ? 'tech' : 'idea')}
                className="flex items-center px-6 py-3 border rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
            )}

            <div className="ml-auto flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title || !formData.description}
                className="flex items-center px-6 py-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" /> Save as Draft
              </button>

              {step !== 'generate' ? (
                <button
                  onClick={() => setStep(step === 'idea' ? 'tech' : step === 'tech' ? 'roles' : 'generate')}
                  disabled={step === 'idea' && (!formData.title || !formData.description)}
                  className="flex items-center px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {loading ? 'Creating...' : 'Create & Generate Repo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}