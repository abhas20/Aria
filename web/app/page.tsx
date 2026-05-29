"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplets,
  HeartPulse,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TimerReset,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const careSteps = [
  {
    icon: CalendarDays,
    title: "Track your cycle",
    body: "Log periods, symptoms, mood, sleep, cravings, and pain in under a minute.",
  },
  {
    icon: Activity,
    title: "Spot PCOS patterns",
    body: "See trends across irregular cycles, energy dips, acne, cramps, and stress.",
  },
  {
    icon: Stethoscope,
    title: "Get simple guidance",
    body: "Talk to Aria in everyday language and bring clearer notes to your doctor.",
  },
];

const metrics = [
  { value: "Cycle", label: "Day 18", tone: "bg-rose-50 text-rose-700 border-rose-100" },
  { value: "Sleep", label: "7.4 hr", tone: "bg-sky-50 text-sky-700 border-sky-100" },
  { value: "Mood", label: "Steady", tone: "bg-violet-50 text-violet-700 border-violet-100" },
];

const features = [
  {
    icon: MessageCircle,
    title: "Ask Aria",
    body: "Private AI support for PCOS questions, symptoms, lifestyle routines, and emotional check-ins.",
    color: "text-rose-600 bg-rose-50 border-rose-100",
  },
  {
    icon: Droplets,
    title: "Daily health log",
    body: "Track water, sleep, periods, symptoms, mood, stress, and meditation from one clean screen.",
    color: "text-sky-700 bg-sky-50 border-sky-100",
  },
  {
    icon: HeartPulse,
    title: "Wellness insights",
    body: "Turn repeated logs into simple summaries you can understand and share during appointments.",
    color: "text-teal-700 bg-teal-50 border-teal-100",
  },
  {
    icon: TimerReset,
    title: "Movement plans",
    body: "Use yoga, breathing, and light fitness timers shaped around energy, stress, and recovery.",
    color: "text-amber-700 bg-amber-50 border-amber-100",
  },
];

const trustItems = [
  "Designed for PCOS, cycle health, and everyday women wellness",
  "Simple UX with no confusing medical dashboards",
  "General guidance only, with clear reminders to consult qualified clinicians",
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const primaryHref = user ? "/dashboard" : "/auth/signup";
  const primaryLabel = user ? "Open dashboard" : "Start free";

  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#172033]">
      <nav className="sticky top-0 z-50 border-b border-[#f0ded6] bg-[#fffaf6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Aria home">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#172033] text-white">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-serif text-2xl text-[#172033]">Aria</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#care" className="hover:text-[#172033]">Care flow</a>
            <a href="#features" className="hover:text-[#172033]">Features</a>
            <a href="#privacy" className="hover:text-[#172033]">Privacy</a>
          </div>

          <div className="flex items-center gap-3">
            {!user && (
              <Link href="/auth/login" className="hidden text-sm font-semibold text-slate-600 hover:text-[#172033] sm:inline">
                Sign in
              </Link>
            )}
            <Link
              href={primaryHref}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24314c]"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-[#f0ded6]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-12">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              PCOS support for women
            </div>

            <h1 className="font-serif text-5xl leading-[0.98] text-[#172033] sm:text-6xl lg:text-7xl">
              Understand your body. Manage PCOS with more confidence.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Aria helps women track cycles, symptoms, mood, sleep, movement, and daily habits in one calm place, with simple guidance when things feel unclear.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#e64b6a] px-6 text-sm font-bold text-white shadow-lg shadow-rose-200/70 transition hover:bg-[#d83f5e]"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-bold text-[#172033] transition hover:border-slate-300"
              >
                Explore features
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <div key={metric.value} className={`rounded-lg border px-4 py-3 ${metric.tone}`}>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">{metric.value}</p>
                  <p className="mt-1 text-lg font-bold">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-white bg-white shadow-2xl shadow-slate-200">
              <Image
                src="/hero-pcos-care.png"
                alt="Woman using a health app in a calm home setting"
                width={1200}
                height={900}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <div className="absolute -bottom-6 left-5 right-5 rounded-xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/80 sm:left-auto sm:right-8 sm:w-80">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Today's focus</p>
                  <p className="mt-1 text-base font-bold text-[#172033]">Lower stress, steady energy</p>
                </div>
                <Moon className="h-5 w-5 text-violet-600" aria-hidden="true" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[72%] rounded-full bg-[#35a99a]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="care" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#e64b6a]">Simple care flow</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-[#172033] sm:text-5xl">
              A clear routine for messy symptoms.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {careSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-xl border border-slate-100 bg-[#fffaf6] p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#172033] text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-serif text-4xl text-rose-200">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[#172033]">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#172033] py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-300">What Aria does</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
                Bold tools, light experience.
              </h2>
            </div>
            <p className="max-w-md leading-7 text-slate-300">
              Everything is made for quick daily use, so tracking PCOS feels supportive instead of overwhelming.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-xl border border-white/10 bg-white p-5 text-[#172033]">
                  <span className={`grid h-11 w-11 place-items-center rounded-lg border ${feature.color}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="privacy" className="bg-[#fffaf6] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#35a99a]">Care with clarity</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-[#172033] sm:text-5xl">
              Professional, private, and easy to trust.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              PCOS can affect cycles, skin, weight, energy, mood, and confidence. Aria keeps the experience organized and human, with language that feels simple.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {trustItems.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#35a99a]" aria-hidden="true" />
                  <p className="leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-lg border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-800">
                Aria is for education and daily wellness support. It does not replace medical diagnosis or treatment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0ded6] bg-white py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-4xl text-[#172033]">Start with one small check-in today.</h2>
            <p className="mt-2 text-slate-600">Simple tracking, gentle guidance, and a clearer picture of your PCOS journey.</p>
          </div>
          <Link
            href={primaryHref}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#e64b6a] px-6 text-sm font-bold text-white shadow-lg shadow-rose-200/70 transition hover:bg-[#d83f5e]"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#fffaf6] py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span className="font-serif text-xl text-[#172033]">Aria</span>
          <p>Women's PCOS wellness support. General health information only.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#172033]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#172033]">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
