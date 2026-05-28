"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore, UserProfile } from "@/store/authStore";
import { useLogStore } from "@/store/logStore";
import { useChatStore } from "@/store/chatStore";
import { signOut } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DangerZone from "@/components/general/DangerZone";
import { HugeiconsIcon } from '@hugeicons/react';
import { LogoutSquare01Icon } from '@hugeicons/core-free-icons'

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthConcern = "pcos" | "mental_health" | "menopause" | "general";
type Language = "en" | "hi";

const HEALTH_CONCERNS: {
  key: HealthConcern;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    key: "pcos",
    label: "PCOS",
    emoji: "🌸",
    description: "Polycystic ovary syndrome",
  },
  {
    key: "mental_health",
    label: "Mental health",
    emoji: "🧠",
    description: "Anxiety, stress, mood",
  },
  {
    key: "menopause",
    label: "Menopause",
    emoji: "🌿",
    description: "Perimenopause & menopause",
  },
  {
    key: "general",
    label: "General health",
    emoji: "💪",
    description: "Overall wellness",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapUserResponse(data: any):UserProfile {
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfileComp({
  user,
}: {
  user: UserProfile;
}) {
  const { setUser } = useAuthStore();

  // Form state — initialised from store
  const [name, setName] = useState(user?.name ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");
  const [language, setLanguage] = useState<Language>(
    (user?.preferredLanguage as Language) ?? "en",
  );
  const [concerns, setConcerns] = useState<HealthConcern[]>(
    (user?.healthConcerns ?? []) as HealthConcern[],
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const initials = getInitials(user.name);

  function toggleConcern(key: HealthConcern) {
    setConcerns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function startEditing() {
    // Reset form to current stored values
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

      // Update Zustand auth store so topbar + dashboard reflect changes immediately
      setUser(mapUserResponse(res.data));
      setSuccess(true);
      setEditing(false);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">My profile</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage your personal details and health preferences
        </p>
      </div>

      {/* ── Avatar + identity card ─────────────────────────────────────── */}
      <Card className="border-gray-100">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
              <span
                className="text-xl font-semibold text-rose-600"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                {initials}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {user.name ?? "No name set"}
              </p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(user.healthConcerns ?? []).map((c: any) => (
                  <span
                    key={c}
                    className="text-[11px] bg-rose-50 text-rose-500 border border-rose-100 px-2 py-0.5 rounded-full capitalize font-medium">
                    {c.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            {!editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={startEditing}
                className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50">
                ✏️ Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Success banner ─────────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <span className="text-green-500">✓</span>
          <p className="text-sm text-green-700 font-medium">
            Profile updated successfully
          </p>
        </div>
      )}

      {/* ── Edit form ──────────────────────────────────────────────────── */}
      {editing ? (
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-800">
                Edit profile
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                className="text-xs text-gray-400 hover:text-gray-600 h-7 px-2">
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm text-gray-600">
                  Full name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-9"
                />
              </div>

              {/* Date of birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-sm text-gray-600">
                  Date of birth{" "}
                  <span className="text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Preferred language
                </Label>
                <div className="flex gap-2">
                  {(["en", "hi"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        language === lang
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                      {lang === "en" ? "🇬🇧 English" : "🇮🇳 हिंदी"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health concerns */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  Health concerns{" "}
                  <span className="text-gray-400">(select all that apply)</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {HEALTH_CONCERNS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleConcern(c.key)}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        concerns.includes(c.key)
                          ? "border-rose-300 bg-rose-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      <span className="text-lg shrink-0 mt-0.5">{c.emoji}</span>
                      <div>
                        <p
                          className={`text-sm font-medium leading-tight ${
                            concerns.includes(c.key)
                              ? "text-rose-700"
                              : "text-gray-700"
                          }`}>
                          {c.label}
                        </p>
                        <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                          {c.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* ── Read-only details ───────────────────────────────────────── */
        <Card className="border-gray-100">
          <CardContent className="pt-5 divide-y divide-gray-50">
            {[
              { label: "Name", value: user.name ?? "—" },
              { label: "Email", value: user.email ?? "—" },
              {
                label: "Date of birth",
                value: user.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—",
              },
              {
                label: "Language",
                value: user.preferredLanguage === "hi" ? "हिंदी" : "English",
              },
              {
                label: "Member since",
                value: new Date(user.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3">
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-700">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Account actions ────────────────────────────────────────────── */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={async () => {
              await signOut();
              useAuthStore.getState().clearAuth();
              useLogStore.getState().clearLog();
              useChatStore.getState().clearChat();
              window.location.replace("/auth/login");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-sm text-gray-600 group">
            <span className="flex items-center gap-2.5">
              <span>
                <HugeiconsIcon
                  icon={LogoutSquare01Icon}
                  size={24}
                  color="#104b97"
                  strokeWidth={1.5}
                />
              </span>{" "}
              Sign out
            </span>
            <span className="text-gray-300 group-hover:text-gray-400">→</span>
          </button>
        </CardContent>
      </Card>

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      <DangerZone />
    </div>
  );
}
