'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Clock3,
  LogOut,
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

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      setIsLoggedIn(true);
      try {
        const parsedUser = JSON.parse(userStr) as {
          name?: string;
          full_name?: string;
          email?: string;
        };
        setUserName(
          parsedUser.name ??
            parsedUser.full_name ??
            parsedUser.email?.split('@')[0] ??
            'Candidate',
        );
      } catch {
        setUserName('Candidate');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
  };

  const reveal = (delayMs: number): CSSProperties => ({
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'both',
  });

  return (
    <main
      className={`${bodyFont.className} relative min-h-screen overflow-hidden bg-[#f4f5ef] text-slate-900`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/55 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.06)_1px,_transparent_0)] bg-[length:28px_28px]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <header className="animate-slide-in rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-slate-300/35 backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-teal-600/35">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className={`${displayFont.className} text-lg font-semibold text-slate-900`}>
                  AI Interview Studio
                </p>
                <p className="text-sm text-slate-600">Practice. Proctor. Perform.</p>
              </div>
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="hidden rounded-xl bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 sm:block">
                  {userName}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/login')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="mt-10 grid items-start gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
          <div className="animate-slide-in" style={reveal(80)}>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1 text-sm font-semibold text-cyan-800">
              <Target className="h-4 w-4" />
              AI-guided interview preparation
            </p>
            <h1
              className={`${displayFont.className} mt-5 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl`}
            >
              Build confidence before the real interview day.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Run realistic technical interviews with adaptive questions, live proctoring, and
              structured feedback so every practice session feels like the real thing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => router.push(isLoggedIn ? '/exam' : '/signup')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/25"
              >
                {isLoggedIn ? 'Continue to Exam' : 'Start Free Interview'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-400"
              >
                See how it works
              </a>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <MetricCard value="3" label="Interview formats" />
              <MetricCard value="< 90s" label="Quick setup check" />
              <MetricCard value="Real-time" label="Integrity signals" />
            </div>
          </div>

          <div
            className="animate-slide-in rounded-3xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-300/30 backdrop-blur-md sm:p-7"
            style={reveal(190)}
          >
            <div className="flex items-center justify-between">
              <h2 className={`${displayFont.className} text-xl font-semibold text-slate-900`}>
                Interview Flow
              </h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Candidate-ready
              </span>
            </div>
            <div className="mt-6 space-y-5">
              <FlowStep
                step="01"
                title="System Readiness"
                description="Camera, microphone, and environment validation before the timer starts."
              />
              <FlowStep
                step="02"
                title="Adaptive Question Set"
                description="MCQ, coding, and descriptive prompts shift in difficulty as you respond."
              />
              <FlowStep
                step="03"
                title="Instant Report"
                description="Get strengths, gaps, and targeted skills to practice next."
              />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Typical session duration</p>
              <p className={`${displayFont.className} mt-1 text-2xl font-semibold text-slate-900`}>
                45-60 minutes
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<BrainCircuit className="h-6 w-6" />}
              title="Adaptive Intelligence"
              description="Questions recalibrate difficulty in real time based on your performance."
              accent="from-cyan-500 to-teal-500"
              delay={70}
            />
            <FeatureCard
              icon={<BookOpenCheck className="h-6 w-6" />}
              title="Balanced Assessments"
              description="Mix of MCQ, coding, and written reasoning for practical evaluation."
              accent="from-emerald-500 to-lime-500"
              delay={140}
            />
            <FeatureCard
              icon={<Camera className="h-6 w-6" />}
              title="Smart Proctoring"
              description="Live camera and audio checks with timeline-friendly integrity markers."
              accent="from-orange-500 to-amber-500"
              delay={210}
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Secure by Design"
              description="Privacy-aware workflows and configurable local storage controls."
              accent="from-slate-700 to-slate-500"
              delay={280}
            />
          </div>
        </section>

        <section
          id="how-it-works"
          className="mt-16 grid gap-6 rounded-3xl border border-white/70 bg-white/75 p-6 shadow-lg shadow-slate-300/30 backdrop-blur-md lg:grid-cols-2 lg:p-8"
        >
          <div className="animate-slide-in" style={reveal(90)}>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              How it works
            </p>
            <h3 className={`${displayFont.className} mt-3 text-3xl font-bold text-slate-900`}>
              A smoother practice loop, from setup to insights.
            </h3>
            <p className="mt-4 max-w-xl text-slate-600">
              The home flow is designed to reduce friction: clear setup checks, focused exam time,
              and actionable guidance right after submission.
            </p>
          </div>
          <div className="space-y-4">
            <StepCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Get ready in under two minutes"
              description="Confirm equipment and room setup quickly before each session."
              delay={140}
            />
            <StepCard
              icon={<Clock3 className="h-5 w-5" />}
              title="Stay focused during the exam"
              description="Structured pacing and integrity monitoring keep interviews fair."
              delay={200}
            />
            <StepCard
              icon={<Target className="h-5 w-5" />}
              title="Practice with clear next actions"
              description="Reports highlight what to strengthen before your next attempt."
              delay={260}
            />
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div
            className="animate-slide-in rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            style={reveal(120)}
          >
            <h4 className={`${displayFont.className} text-2xl font-semibold text-slate-900`}>
              Before You Begin
            </h4>
            <p className="mt-2 text-slate-600">
              A quick pre-flight list to help you avoid interruptions.
            </p>
            <ul className="mt-5 space-y-3 text-slate-700">
              <ChecklistItem label="Stable internet and fully charged device" />
              <ChecklistItem label="Working camera and microphone permissions" />
              <ChecklistItem label="Quiet, well-lit room for consistent proctoring" />
              <ChecklistItem label="At least 60 minutes blocked for one attempt" />
            </ul>
          </div>
          <div
            className="animate-slide-in rounded-3xl bg-slate-900 p-6 text-white shadow-2xl shadow-slate-500/25 sm:p-8 lg:max-w-sm"
            style={reveal(220)}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
              Ready now?
            </p>
            <h5 className={`${displayFont.className} mt-3 text-2xl font-semibold`}>
              Launch your next AI interview.
            </h5>
            <p className="mt-3 text-slate-300">
              Start a fresh session and get feedback you can act on immediately.
            </p>
            <button
              onClick={() => router.push(isLoggedIn ? '/exam' : '/login')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 font-semibold text-slate-900 transition hover:bg-cyan-300"
            >
              {isLoggedIn ? 'Start Examination' : 'Login to Begin'}
              <ArrowRight className="h-4 w-4" />
            </button>
            {!isLoggedIn && (
              <button
                onClick={() => router.push('/signup')}
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 px-5 py-3.5 font-semibold text-slate-100 transition hover:border-slate-500"
              >
                Create account
              </button>
            )}
          </div>
        </section>

        <footer className="mt-10 text-center text-sm text-slate-500">
          <p>Powered by modern AI services and built with Next.js + FastAPI.</p>
        </footer>
      </div>
    </main>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
      <p className={`${displayFont.className} text-2xl font-semibold text-slate-900`}>{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function FlowStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {step}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
  delay,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
  delay: number;
}) {
  return (
    <article
      className="animate-slide-in rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md`}
      >
        {icon}
      </div>
      <h3 className={`${displayFont.className} text-lg font-semibold text-slate-900`}>{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}

function StepCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <article
      className="animate-slide-in rounded-2xl border border-slate-200 bg-slate-50 p-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-cyan-300">
          {icon}
        </span>
        <div>
          <h4 className="font-semibold text-slate-900">{title}</h4>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </article>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
    </li>
  );
}
