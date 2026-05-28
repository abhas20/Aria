"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { signOut } from "@/lib/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: HomeIcon },
  { href: "/dashboard/aria", label: "Dr. Aria", icon: AriaIcon },
  { href: "/dashboard/log", label: "Health Log", icon: LogIcon },
  { href: "/dashboard/yoga", label: "Yoga", icon: YogaIcon },
  { href: "/dashboard/timer", label: "Timer", icon: TimerIcon },
  { href: "/dashboard/store", label: "Wellness", icon: StoreIcon },
  { href: "/dashboard/summary", label: "Summary", icon: SummaryIcon },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
function AriaIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M12 2a8 8 0 1 0 0 16A8 8 0 0 0 12 2z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
      <path d="M12 18v4M8 22h8" />
    </svg>
  );
}
function LogIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function YogaIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.5" />
      <path d="M12 6v5l-3 3M12 11l3 3M6 17c1.5-1 3.5-1.5 6-1.5s4.5.5 6 1.5" />
    </svg>
  );
}
function TimerIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 3h6M12 3v2" />
    </svg>
  );
}
function StoreIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SummaryIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6">
        <Link href="/dashboard" onClick={onNavigate}>
          <span
            className="text-2xl text-rose-500 tracking-wide"
            style={{ fontFamily: "'DM Serif Display', serif" }}>
            Aria
          </span>
        </Link>
        <p className="text-xs text-gray-400 mt-0.5 font-light">
          Your health companion
        </p>
      </div>

      <Separator className="mb-4 bg-rose-50" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                active
                  ? "bg-rose-50 text-rose-600 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}>
              <span
                className={`transition-colors ${
                  active
                    ? "text-rose-500"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}>
                <Icon active={active} />
              </span>
              {label}
              {href === "/dashboard/aria" && (
                <span className="ml-auto text-[10px] bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded-full font-medium">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom hint */}
      <div className="px-4 pb-6 mt-4">
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
          <p className="text-xs text-rose-600 font-medium mb-1">
            Weekly summary
          </p>
          <p className="text-xs text-gray-400 font-light leading-relaxed">
            Aria generates your health insights every Sunday.
          </p>
          <Link
            href="/dashboard/log"
            className="mt-2 block text-xs text-rose-500 hover:text-rose-600 transition-colors">
            View summary →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  async function handleSignOut() {
    await signOut();
    router.replace("/auth/login");
  }

  const currentPage =
    NAV_ITEMS.find((n) =>
      n.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(n.href),
    )?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-[#faf8f5] flex">
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-r border-gray-100 z-40">
        <SidebarContent />
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* ── Top navbar ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#faf8f5]/90 backdrop-blur-md border-b border-gray-100/80">
          <div className="flex items-center justify-between h-14 px-4 md:px-6">
            {/* Mobile: hamburger + page title */}
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger className="lg:hidden text-gray-500 hover:text-gray-800 transition-colors p-1">
                    <MenuIcon />
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-white">
                  <SidebarContent onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              {/* Page title */}
              <div className="flex items-center gap-2">
                <span
                  className="lg:hidden text-lg text-rose-500"
                  style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Aria
                </span>
                <span className="hidden lg:block text-gray-300">/</span>
                <span className="text-sm text-gray-500 font-medium">
                  {currentPage}
                </span>
              </div>
            </div>

            {/* Right: health concerns tags + avatar */}
            <div className="flex items-center gap-3">
              {/* Health concern chips — desktop only */}
              {user?.healthConcerns && user.healthConcerns.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5">
                  {user.healthConcerns.slice(0, 2).map((concern) => (
                    <span
                      key={concern}
                      className="text-[11px] bg-rose-50 text-rose-500 border border-rose-100 px-2 py-0.5 rounded-full capitalize font-medium">
                      {concern.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-rose-200 transition-all outline-none">
                  <Avatar className="h-8 w-8 border border-rose-100">
                    <AvatarFallback className="bg-rose-50 text-rose-600 text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user?.name ?? "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email ?? ""}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer">
                    <span className="mr-2">👤</span> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/onboarding")}
                    className="cursor-pointer">
                    <span className="mr-2">⚙️</span> Update preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-500 focus:text-red-600 cursor-pointer">
                    <span className="mr-2">→</span> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
