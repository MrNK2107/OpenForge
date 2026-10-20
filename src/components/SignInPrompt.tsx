import Link from 'next/link';
import { Lock } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/config';

/** Empty state shown on pages that need a signed-in user. */
export function SignInPrompt({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
          <Lock className="h-5 w-5 text-violet-600" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mb-6 text-gray-600">{message}</p>
        {isSupabaseConfigured ? (
          <a
            href="/api/auth/github"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 font-medium text-white hover:bg-gray-800"
          >
            Sign in with GitHub
          </a>
        ) : (
          <>
            <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Sign-in needs Supabase and a GitHub OAuth app. Add them to <code className="font-mono">.env.local</code>{' '}
              (see the README) to enable accounts.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700"
              >
                Explore demo projects
              </Link>
              <Link
                href="/matches"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                See sample matches
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
