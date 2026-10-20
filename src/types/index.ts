export interface User {
  id: string;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  roles: string[];
  availability: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  category: 'tech' | 'domain' | 'role' | 'difficulty';
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'seeking' | 'active' | 'paused' | 'archived';
  difficulty: string | null;
  scope: string | null;
  time_commitment: string | null;
  github_repo_url: string | null;
  github_repo_id: number | null;
  template_type: string | null;
  license: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
  tags?: Tag[];
  members?: ProjectMember[];
  stars_count?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'maintainer' | 'contributor' | 'mentor';
  status: 'active' | 'inactive' | 'left';
  joined_at: string;
  user?: User;
}

export interface ProjectRoleNeeded {
  id: string;
  project_id: string;
  role_name: string;
  filled: boolean;
  filled_by: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  difficulty: string | null;
  labels: string[];
  assignee_id: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  effort_estimate: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  project_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  created_at: string;
  responded_at: string | null;
  user?: User;
}

export interface MatchResult {
  project: Project;
  score: number;
  reasons: string[];
}