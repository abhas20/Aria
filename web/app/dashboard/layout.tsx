"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CalendarCheck,
  Dumbbell,
  Home,
  LogOut,
  NotebookPen,
  ShoppingBag,
  Sparkles,
  TimerReset,
  UserRound,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRequireAuth } from "../hooks/useAuth";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/log", label: "Daily log", icon: NotebookPen },
  { href: "/dashboard/summary", label: "Summary", icon: CalendarCheck },
  { href: "/dashboard/aria", label: "Ask Aria", icon: Bot },
  { href: "/dashboard/yoga", label: "Yoga", icon: Dumbbell },
  { href: "/dashboard/timer", label: "Timer", icon: TimerReset },
  { href: "/dashboard/store", label: "Store", icon: ShoppingBag },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useRequireAuth();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  if (isLoading || !user) return null;

  const firstName = user.name?.split(" ")[0] ?? "there";

  function handleSignOut() {
    clearAuth();
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[#fffaf6] text-[#172033]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-[#f0ded6] bg-white px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3 px-2" aria-label="Aria dashboard">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#172033] text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-serif text-2xl leading-none">Aria</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">PCOS care</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                  active
                    ? "bg-[#172033] text-white shadow-sm"
                    : "text-slate-600 hover:bg-[#fff4ef] hover:text-[#172033]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4">
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#fffaf6] p-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#172033]">{firstName}</p>
              <p className="truncate text-xs text-slate-500">{user.email ?? "Profile"}</p>
            </div>
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#f0ded6] bg-[#fffaf6]/90 backdrop-blur-xl lg:ml-72">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-[#172033] lg:hidden"
              aria-label="Aria dashboard home"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e64b6a]">Aria dashboard</p>
              <p className="text-sm font-semibold text-slate-600">Track patterns, care gently, act clearly.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/log"
              className="hidden h-10 items-center rounded-lg bg-[#e64b6a] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#d83f5e] sm:inline-flex"
            >
              Log today
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-[#172033]"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-[#f0ded6] px-4 py-2 lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
                  active ? "bg-[#172033] text-white" : "bg-white text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-5 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
