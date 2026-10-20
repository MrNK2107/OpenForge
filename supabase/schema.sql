-- OpenForge Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id INTEGER UNIQUE,
    username TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    roles TEXT[] DEFAULT ARRAY['contributor'],
    availability TEXT,
    github_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('tech', 'domain', 'role', 'difficulty')),
    color TEXT DEFAULT '#7c3aed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'seeking', 'active', 'paused', 'archived')),
    difficulty TEXT,
    scope TEXT,
    time_commitment TEXT,
    github_repo_url TEXT,
    github_repo_id INTEGER,
    template_type TEXT,
    license TEXT DEFAULT 'MIT',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'maintainer', 'contributor', 'mentor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project tags table
CREATE TABLE IF NOT EXISTS public.project_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    UNIQUE(project_id, tag_id)
);

-- Project roles needed table
CREATE TABLE IF NOT EXISTS public.project_roles_needed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    filled BOOLEAN DEFAULT false,
    filled_by UUID REFERENCES public.users(id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
    difficulty TEXT,
    labels TEXT[] DEFAULT ARRAY[]::TEXT[],
    assignee_id UUID REFERENCES public.users(id),
    github_issue_url TEXT,
    github_issue_number INTEGER,
    effort_estimate TEXT,
    due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project stars table
CREATE TABLE IF NOT EXISTS public.project_stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- User skills table
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    UNIQUE(user_id, tag_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Join requests table
CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(project_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_join_requests_project_id ON public.join_requests(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Public users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Public projects are viewable by everyone" ON public.projects
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their projects" ON public.projects
    FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies for tasks
CREATE POLICY "Project tasks are viewable by project members" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Contributors can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id
            AND project_members.user_id = auth.uid()
        )
    );

-- Insert default tags
INSERT INTO public.tags (name, category, color) VALUES
    ('JavaScript', 'tech', '#f7df1e'),
    ('TypeScript', 'tech', '#3178c6'),
    ('Python', 'tech', '#3776ab'),
    ('React', 'tech', '#61dafb'),
    ('Next.js', 'tech', '#000000'),
    ('Node.js', 'tech', '#339933'),
    ('PostgreSQL', 'tech', '#336791'),
    ('MongoDB', 'tech', '#47a248'),
    ('Docker', 'tech', '#2496ed'),
    ('AWS', 'tech', '#ff9900'),
    ('GraphQL', 'tech', '#e10098'),
    ('REST API', 'tech', '#6ba539'),
    ('Machine Learning', 'tech', '#ff6f00'),
    ('DevOps', 'tech', '#ff6b6b'),
    ('UI/UX Design', 'tech', '#f24e1e'),
    ('Web3', 'tech', '#168eea'),
    ('Blockchain', 'tech', '#121d33'),
    ('Mobile', 'tech', '#007aff'),
    ('Open Source', 'domain', '#7c3aed'),
    ('SaaS', 'domain', '#10b981'),
    ('E-commerce', 'domain', '#f59e0b'),
    ('Education', 'domain', '#3b82f6'),
    ('Healthcare', 'domain', '#ef4444'),
    ('Fintech', 'domain', '#8b5cf6'),
    ('Gaming', 'domain', '#22c55e'),
    ('Sustainability', 'domain', '#22c55e'),
    ('Social Impact', 'domain', '#ec4899'),
    ('Frontend Developer', 'role', '#06b6d4'),
    ('Backend Developer', 'role', '#8b5cf6'),
    ('Full Stack Developer', 'role', '#7c3aed'),
    ('DevOps Engineer', 'role', '#f97316'),
    ('Data Scientist', 'role', '#eab308'),
    ('ML Engineer', 'role', '#84cc16'),
    ('UI/UX Designer', 'role', '#f472b6'),
    ('Technical Writer', 'role', '#a78bfa'),
    ('Beginner-friendly', 'difficulty', '#22c55e'),
    ('Intermediate', 'difficulty', '#f59e0b'),
    ('Advanced', 'difficulty', '#ef4444')
ON CONFLICT (name) DO NOTHING;