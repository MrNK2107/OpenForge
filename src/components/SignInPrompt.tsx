import Link from 'next/link';
import { Lock } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/config';

/** Empty state shown on pages that need a signed-in user. */
export function SignInPrompt({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
          <Lock className="h-5 w-5 text-orange-400" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-neutral-100">{title}</h1>
        <p className="mb-6 text-neutral-400">{message}</p>
        {isSupabaseConfigured ? (
          <a
            href="/api/auth/github"
            className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-500"
          >
            Sign in with GitHub
          </a>
        ) : (
          <>
            <p className="mb-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Sign-in needs Supabase and a GitHub OAuth app. Add them to <code className="font-mono">.env.local</code>{' '}
              (see the README) to enable accounts.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-500"
              >
                Explore demo projects
              </Link>
              <Link
                href="/matches"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-white/20 px-5 py-2.5 font-medium text-neutral-300 hover:bg-white/5"
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
