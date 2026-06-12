"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore, UserProfile } from "@/store/authStore";
import { useLogStore } from "@/store/logStore";
import { useChatStore } from "@/store/chatStore";
import { signOut } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DangerZone from "@/components/general/DangerZone";
import {
  User,
  Mail,
  Calendar as CalendarIcon,
  Globe,
  Clock,
  ArrowLeft,
  Edit2,
  LogOut,
  Check,
  AlertCircle,
  Settings,
} from "lucide-react";

type HealthConcern = "pcos" | "mental_health" | "menopause" | "general";
type Language = "en" | "hi";

const HEALTH_CONCERNS: {
  key: HealthConcern;
  label: string;
  emoji: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    key: "pcos",
    label: "PCOS",
    emoji: "🌸",
    description: "Polycystic ovary syndrome",
    badgeBg: "bg-rose-50/50",
    badgeText: "text-rose-600",
    badgeBorder: "border-rose-100/50",
  },
  {
    key: "mental_health",
    label: "Mental health",
    emoji: "🧠",
    description: "Anxiety, stress, mood",
    badgeBg: "bg-indigo-50/50",
    badgeText: "text-indigo-600",
    badgeBorder: "border-indigo-100/50",
  },
  {
    key: "menopause",
    label: "Menopause",
    emoji: "🌿",
    description: "Perimenopause & menopause",
    badgeBg: "bg-emerald-50/50",
    badgeText: "text-emerald-600",
    badgeBorder: "border-emerald-100/50",
  },
  {
    key: "general",
    label: "General health",
    emoji: "💪",
    description: "Overall wellness",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-600",
    badgeBorder: "border-slate-200/50",
  },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapUserResponse(data: any): UserProfile {
  return {
    id: data.id,
    firebaseUid: data.firebase_uid,
    email: data.email,
    name: data.name,
    dateOfBirth: data.date_of_birth,
    createdAt: data.created_at,
    healthConcerns: data.health_concerns,
    preferredLanguage: data.preferred_language,
    onboardingComplete: data.onboarding_complete,
  };
}

export default function ProfileComp({ user }: { user: UserProfile }) {
  const { setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");
  const [language, setLanguage] = useState<Language>(
    (user?.preferredLanguage as Language) ?? "en"
  );
  const [concerns, setConcerns] = useState<HealthConcern[]>(
    (user?.healthConcerns ?? []) as HealthConcern[]
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const initials = getInitials(user.name);

  function toggleConcern(key: HealthConcern) {
    setConcerns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  function startEditing() {
    setName(user.name ?? "");
    setDob(user.dateOfBirth ?? "");
    setLanguage((user.preferredLanguage as Language) ?? "en");
    setConcerns((user.healthConcerns ?? []) as HealthConcern[]);
    setError("");
    setSuccess(false);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError("");
    setSaving(true);
    setSuccess(false);

    try {
      const res = await api.patch("/auth/me", {
        name: name.trim(),
        date_of_birth: dob || null,
        preferred_language: language,
        health_concerns: concerns,
      });

      setUser(mapUserResponse(res.data));
      setSuccess(true);
      setEditing(false);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const handleSignOut = async () => {
    await signOut();
    useAuthStore.getState().clearAuth();
    useLogStore.getState().clearLog();
    useChatStore.getState().clearChat();
    window.location.replace("/auth/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6 text-slate-800">
      
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-600 transition duration-150 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Overview
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
          <Settings className="h-3.5 w-3.5 animate-spin-slow text-indigo-400" /> Settings
        </span>
      </div>

      {/* Profile details header */}
      <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-rose-100 to-indigo-100/60" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10 sm:-mt-8 px-2">
            {/* Avatar initials */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-serif font-black shadow-md border-4 border-white shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1 mt-1 sm:mt-0">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                {user.name ?? "No name set"}
              </h1>
              <p className="text-xs text-slate-400 font-medium leading-none">{user.email}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                {(user.healthConcerns ?? []).map((c: string) => {
                  const item = HEALTH_CONCERNS.find((hc) => hc.key === c);
                  return (
                    <span
                      key={c}
                      className={`text-[10px] border px-2 py-0.5 rounded-full capitalize font-bold ${
                        item?.badgeBg || "bg-slate-50"
                      } ${item?.badgeText || "text-slate-600"} ${
                        item?.badgeBorder || "border-slate-100"
                      }`}
                    >
                      {item?.emoji} {c.replace("_", " ")}
                    </span>
                  );
                })}
              </div>
            </div>

            {!editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={startEditing}
                className="mt-3 sm:mt-0 shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 rounded-xl px-4"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success notification banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"
          >
            <Check className="h-4.5 w-4.5 text-emerald-500" />
            <p className="text-xs text-emerald-700 font-bold">
              Your profile has been updated successfully!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content card: Read-only details VS Edit Form */}
      {editing ? (
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                Edit Profile
              </CardTitle>
              <CardDescription className="text-xs">Update your core personal health information.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600 h-8 px-3 rounded-xl"
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSave} className="space-y-5">
              {/* Full Name input */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-9 h-10 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* DOB input */}
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Date of birth <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDob(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Language choice */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Preferred Language
                </Label>
                <div className="flex gap-3">
                  {(["en", "hi"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                        language === lang
                          ? "border-rose-400 bg-rose-50/50 text-rose-700 font-bold"
                          : "border-slate-200 bg-slate-50/30 text-slate-500 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      {lang === "en" ? "🇬🇧 English" : "🇮🇳 हिंदी (Hindi)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concerns selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Health concerns <span className="text-slate-400 normal-case font-normal">(select all that apply)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HEALTH_CONCERNS.map((c) => {
                    const selected = concerns.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleConcern(c.key)}
                        className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all duration-200 ${
                          selected
                            ? "border-rose-400 bg-rose-50/35"
                            : "border-slate-100 bg-slate-50/30 hover:border-rose-200 hover:bg-white"
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{c.emoji}</span>
                        <div>
                          <p className={`text-sm font-bold ${selected ? "text-rose-700" : "text-slate-700"}`}>
                            {c.label}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                            {c.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-xl h-11 shadow-md"
              >
                {saving ? "Saving Changes…" : "Save Preferences"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Read-only layout details */
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
          <CardContent className="p-0 divide-y divide-slate-100">
            {[
              {
                label: "Name",
                value: user.name ?? "—",
                icon: User,
              },
              {
                label: "Email Address",
                value: user.email ?? "—",
                icon: Mail,
              },
              {
                label: "Date of birth",
                value: user.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—",
                icon: CalendarIcon,
              },
              {
                label: "Preferred Language",
                value: user.preferredLanguage === "hi" ? "हिंदी (Hindi)" : "English (UK)",
                icon: Globe,
              },
              {
                label: "Member since",
                value: user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—",
                icon: Clock,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/20 transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-slate-50 text-slate-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-slate-400">{label}</p>
                </div>
                <p className="text-sm font-bold text-slate-700">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Account Settings options */}
      <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
        <CardHeader className="pb-3 border-b border-slate-50">
          <CardTitle className="text-base font-bold text-slate-800">
            Account Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-all duration-200 text-sm font-semibold text-slate-600 hover:text-rose-600 group"
          >
            <span className="flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors duration-200">
                <LogOut className="h-4 w-4" />
              </span>
              Sign Out
            </span>
            <span className="text-slate-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all duration-200">
              →
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Danger zone actions wrapper */}
      <div className="pt-2">
        <DangerZone />
      </div>
    </div>
  );
}
