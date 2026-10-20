'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, Briefcase } from 'lucide-react';
import type { User as UserType, Tag } from '@/types';
import { fetchJson, fetchArray } from '@/lib/fetch-json';
import { SignInPrompt } from '@/components/SignInPrompt';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    availability: '',
    roles: [] as string[],
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchJson<UserType | null>('/api/auth/me', null),
      fetchArray<Tag>('/api/tags'),
    ]).then(([userData, tagsData]) => {
      setUser(userData);
      setTags(tagsData);
      if (userData) {
        setFormData({
          bio: userData.bio || '',
          availability: userData.availability || '',
          roles: userData.roles || [],
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: formData.bio,
          availability: formData.availability,
          roles: formData.roles,
          skills: selectedSkills,
        }),
      });
      
      if (res.ok) {
        alert('Profile updated!');
      } else {
        alert('Failed to update profile');
      }
    } catch {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt title="Your profile" message="Sign in to manage your skills, roles and availability." />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <div className="bg-white rounded-xl border p-6 space-y-6">
          {/* Avatar & Basic Info */}
          <div className="flex items-center space-x-6">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-20 h-20 rounded-full" />
            ) : (
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-violet-600">{user.username?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" /> Availability
            </label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full border rounded-lg px-4 py-3"
            >
              <option value="">Select availability</option>
              <option value="1-2 hrs/week">1-2 hrs/week</option>
              <option value="2-5 hrs/week">2-5 hrs/week</option>
              <option value="5-10 hrs/week">5-10 hrs/week</option>
              <option value="10+ hrs/week">10+ hrs/week</option>
            </select>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" /> Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {['Pitcher', 'Contributor', 'Mentor'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role.toLowerCase())}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    formData.roles.includes(role.toLowerCase())
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.filter(t => t.category === 'tech').map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleSkill(tag.name)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    selectedSkills.includes(tag.name)
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}