'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to login. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`${bodyFont.className} relative min-h-screen overflow-hidden bg-[#f4f5ef] text-slate-900`}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/55 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.06)_1px,_transparent_0)] bg-[length:28px_28px]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-2xl shadow-slate-400/20 backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative bg-slate-900 p-7 text-white sm:p-9">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>

            <div className="mt-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <Sparkles className="h-4 w-4" />
                Candidate access
              </p>
              <h1 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight sm:text-4xl`}>
                Welcome back to your AI interview workspace.
              </h1>
              <p className="mt-4 text-slate-300">
                Log in to continue your exam journey, monitor progress, and review skill-focused
                feedback.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <AuthInsight
                icon={<Target className="h-4 w-4" />}
                label="Adaptive questions across MCQ, coding, and descriptive rounds."
              />
              <AuthInsight
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Session integrity checks with privacy-aware monitoring."
              />
              <AuthInsight
                icon={<Sparkles className="h-4 w-4" />}
                label="Actionable reports after every attempt."
              />
            </div>
          </section>

          <section className="p-7 sm:p-9">
            <div className="mb-7">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Login</p>
              <h2 className={`${displayFont.className} mt-2 text-3xl font-semibold text-slate-900`}>
                Continue your preparation
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter your credentials to resume interviews and reports.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
                    placeholder="********"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-base font-semibold text-white transition hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/25 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function AuthInsight({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2.5">
      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400/20 text-cyan-300">
        {icon}
      </span>
      <p className="text-sm text-slate-200">{label}</p>
    </div>
  );
}
