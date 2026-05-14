"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

// ── Feature data ──────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: "✦",
    title: "Dr. Aria",
    subtitle: "AI doctor friend",
    description:
      "Voice-first conversations in Hindi or English. Symptom checks, cycle guidance, and emotional support — available 24/7, never judgmental.",
    color: "rose",
  },
  {
    icon: "◈",
    title: "Live yoga coach",
    subtitle: "Camera-based pose detection",
    description:
      "Your webcam becomes a yoga instructor. Real-time pose scoring, voice corrections, and sessions built for PCOS, menopause, and stress.",
    color: "amber",
  },
  {
    icon: "◉",
    title: "Health log",
    subtitle: "Intelligent tracking",
    description:
      "Period, mood, sleep, symptoms, water — logged in seconds. Aria reads your patterns and surfaces insights you'd never notice alone.",
    color: "teal",
  },
  {
    icon: "◎",
    title: "Fitness timer",
    subtitle: "Smart intervals",
    description:
      "HIIT, Tabata, and rest intervals with voice countdown. Pre-built plans for PCOS, postpartum recovery, and stress relief.",
    color: "violet",
  },
  {
    icon: "◇",
    title: "Wellness store",
    subtitle: "Curated for you",
    description:
      "Supplements, menstrual products, and yoga props recommended by Aria based on your actual health data. Not ads — genuine picks.",
    color: "rose",
  },
];

const PROBLEMS = [
  {
    stat: "1 in 5",
    label: "Indian women have PCOS",
    body: "Most receive a diagnosis but no sustained care plan. Aria fills that gap every day.",
  },
  {
    stat: "83%",
    label: "lack mental health access",
    body: "Cultural stigma and doctor shortages leave millions without support. Aria is private, always available, and never dismissive.",
  },
  {
    stat: "Millions",
    label: "navigate menopause alone",
    body: "It's rarely discussed openly. Aria normalises the conversation and provides evidence-based guidance.",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-100",  icon: "text-rose-400"   },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100", icon: "text-amber-400"  },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-100",  icon: "text-teal-400"   },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100",icon: "text-violet-400" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .serif { font-family: 'DM Serif Display', serif; }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.25s; }
        .fade-up-3 { animation-delay: 0.4s; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pill-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pill-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -4px rgba(0,0,0,0.08);
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#faf8f5]/90 backdrop-blur-md border-b border-rose-100/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="serif text-xl text-rose-600 tracking-wide">Aria</span>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-4 py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">

        {/* Badge */}
        <div className="fade-up inline-flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 text-xs text-rose-600 font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          Built for Indian women · Available in Hindi & English
        </div>

        {/* Headline */}
        <h1 className="fade-up fade-up-1 serif text-5xl md:text-6xl lg:text-7xl text-gray-900 leading-[1.1] mb-6">
          Your health companion,<br />
          <span className="text-rose-500 italic">finally in your language.</span>
        </h1>

        <p className="fade-up fade-up-2 text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed font-light">
          Voice-first AI health support for PCOS, menopause, and mental wellness —
          designed around how Indian women actually live.
        </p>

        <div className="fade-up fade-up-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={user ? "/dashboard" : "/auth/signup"}
            className="bg-rose-500 hover:bg-rose-600 text-white font-medium px-8 py-3.5 rounded-full text-sm transition-colors shadow-sm shadow-rose-200"
          >
            {user ? "Go to dashboard" : "Start for free"}
          </Link>
          <Link
            href="#features"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5 group"
          >
            See how it works
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Hero visual — abstract health cards floating */}
        <div className="mt-16 relative flex items-center justify-center gap-4 flex-wrap">
          {[
            { label: "Mood today", value: "Calm ✦", color: "bg-violet-50 border-violet-100 text-violet-700" },
            { label: "Sleep", value: "7.5 hrs", color: "bg-teal-50 border-teal-100 text-teal-700" },
            { label: "Period", value: "Day 3", color: "bg-rose-50 border-rose-100 text-rose-700" },
            { label: "Water", value: "1.2 L", color: "bg-amber-50 border-amber-100 text-amber-700" },
          ].map((card) => (
            <div
              key={card.label}
              className={`${card.color} border rounded-2xl px-5 py-3 text-left pill-hover`}
            >
              <p className="text-xs opacity-60 font-medium mb-0.5">{card.label}</p>
              <p className="text-sm font-medium">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problems we solve ─────────────────────────────────────────────── */}
      <section className="bg-[#1a0f0a] text-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-rose-300 text-xs font-medium uppercase tracking-widest mb-10 text-center">
            Why Aria exists
          </p>
          <div className="grid md:grid-cols-3 gap-px bg-white/5">
            {PROBLEMS.map((p) => (
              <div key={p.stat} className="bg-[#1a0f0a] p-8">
                <p className="serif text-4xl text-rose-400 mb-1">{p.stat}</p>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">{p.label}</p>
                <p className="text-white/70 text-sm leading-relaxed font-light">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-rose-400 text-xs font-medium uppercase tracking-widest mb-3">Five pillars</p>
          <h2 className="serif text-4xl md:text-5xl text-gray-900">
            Everything in one place
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p, i) => {
            const c = COLOR_MAP[p.color];
            return (
              <div
                key={p.title}
                className={`${c.bg} border ${c.border} rounded-2xl p-6 pill-hover ${
                  i === 2 ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <span className={`${c.icon} text-2xl block mb-4`}>{p.icon}</span>
                <p className={`${c.text} text-xs font-medium uppercase tracking-wide mb-1`}>
                  {p.subtitle}
                </p>
                <h3 className={`${c.text} serif text-xl mb-3`}>{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-light">{p.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Voice first callout ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-rose-500 rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
          <div className="relative">
            <p className="text-rose-200 text-xs font-medium uppercase tracking-widest mb-4">
              Voice first
            </p>
            <h2 className="serif text-3xl md:text-4xl mb-4">
              Talk to Aria like a friend.<br />In Hindi. In English. In your words.
            </h2>
            <p className="text-rose-100 text-sm max-w-md mx-auto mb-8 font-light leading-relaxed">
              No forms, no menus. Just speak. Aria understands your symptoms, your cycle,
              your feelings — and responds in the language you think in.
            </p>
            <Link
              href={user ? "/dashboard/aria" : "/auth/signup"}
              className="inline-flex items-center gap-2 bg-white text-rose-600 font-medium px-7 py-3 rounded-full text-sm hover:bg-rose-50 transition-colors"
            >
              Try talking to Aria →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="serif text-4xl text-gray-900">Simple from day one</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Sign up in 30 seconds", body: "Google or email. No credit card. No prescription required." },
            { step: "02", title: "Tell Aria about yourself", body: "Two-minute onboarding — health concerns, language, date of birth." },
            { step: "03", title: "Start talking", body: "Chat, log your day, do a yoga session. Aria learns your patterns over time." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <p className="serif text-5xl text-rose-100 mb-4">{s.step}</p>
              <h3 className="font-medium text-gray-800 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-400 font-light leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#fdf0f0] border-t border-rose-100 py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="serif text-4xl md:text-5xl text-gray-900 mb-4">
            Your health,<br /><span className="text-rose-500 italic">finally understood.</span>
          </h2>
          <p className="text-gray-400 text-sm mb-8 font-light">
            Free to start. No app to download. Works in your browser right now.
          </p>
          <Link
            href={user ? "/dashboard" : "/auth/signup"}
            className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-medium px-10 py-4 rounded-full text-sm transition-colors shadow-md shadow-rose-200"
          >
            {user ? "Back to dashboard" : "Get started — it's free"}
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="serif text-lg text-rose-500">Aria</span>
          <p className="text-xs text-gray-400 text-center">
            General health information only — not medical advice. Always consult a qualified doctor.
          </p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}